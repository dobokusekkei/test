import { STEEL_DB, EPS } from './constants.js';

export function normalizeText(text) {
  return text.replace(/[０-９．，]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/、/g, ',');
}

/**
 * 鋼材特性を取得する関数
 */
export function getSteelProps(shape, name, axis) {
  const props = STEEL_DB[name];
  if (!props) {
    return { H:0, B:0, t1:0, t2:0, I:0, Z:0, A:0, w:0, label: name + ' (Unk)' };
  }

  // 寸法情報の取得（描画用）
  let H = 0, B = 0, t1 = 0, t2 = 0, C_lip = 0;
    
  if (shape.includes('SheetPile')) {
    H = props.H; B = props.B; t1 = props.t; t2 = props.t;
  } else if (shape === 'SquarePipe') {
    // Square-100x100x3.2 -> H=100, B=100, t1=3.2
    const nums = name.replace(/^Square-/, '').split('x').map(Number);
    [H, B, t1] = nums; t2 = t1;
  } else {
    const nums = name.replace(/^[A-Z]-/, '').split('x').map(Number);
    if (shape === 'H' || shape === 'Channel') { [H, B, t1, t2] = nums; } 
    else if (shape === 'LipChannel') { [H, B, C_lip, t1] = nums; t2 = t1; } 
    else if (shape === 'Angle') { [H, B, t1] = nums; t2 = t1; }
  }

  // 軸に応じた値を返す (I, Zは mm単位に換算)
  let I, Z;
  if (axis === 'strong') {
    I = props.Ix * 10000; 
    Z = props.Zx * 1000;
  } else {
    I = props.Iy * 10000; 
    Z = props.Zy * 1000;
  }

  return { H, B, t1, t2, C_lip, I, Z, A: props.A, w: props.w };
}

// ==========================================
// [CORE ENGINE] Universal Beam Solver
// ==========================================

export function solveGeneralBeam(spans, supports, loads, resolution, props) {
  const totalL = spans.reduce((a, b) => a + b, 0);
  const validSupportIndices = supports.map((s, i) => s !== 'free' ? i : -1).filter(i => i !== -1);
  if (validSupportIndices.length < 1) return generateEmptyResult();

  const idxStart = validSupportIndices[0];
  const idxEnd = validSupportIndices[validSupportIndices.length - 1];

  const spanLoads = spans.map(() => []);
  let cx = 0;
  spans.forEach((len, i) => {
    const sx = cx; const ex = cx + len;
    loads.forEach(l => {
      // ----------------------------------------------------------------
      // ★[MODIFIED] 固定端(Fixed)上の集中モーメント荷重を計算から除外 (v21.18)
      // ----------------------------------------------------------------
      // 左端固定の場合: 座標0 かつ 支点0がfixed
      if (l.type === 'moment' && l.pos === 0 && supports[0] === 'fixed') {
          return; 
      }
      // 右端固定の場合: 座標totalL かつ 最終支点がfixed
      if (l.type === 'moment' && l.pos === totalL && supports[supports.length - 1] === 'fixed') {
          return;
      }
      // ----------------------------------------------------------------

      const lStart = l.pos;
      const lEnd = l.type === 'point' || l.type === 'moment' ? l.pos : l.pos + l.length;
      const oStart = Math.max(sx, lStart);
      const oEnd = Math.min(ex, lEnd);
      if ((oEnd > oStart + EPS) || ((l.type === 'point' || l.type === 'moment') && lStart >= sx - EPS && (i === spans.length-1 ? lStart <= ex + EPS : lStart < ex - EPS))) {
        let mag = l.mag; let magEnd = l.magEnd;
        if (l.type === 'trapezoid') {
           const slope = (l.magEnd - l.mag) / l.length;
           mag = l.mag + slope * (oStart - l.pos);
           magEnd = l.mag + slope * (oEnd - l.pos);
        }
        spanLoads[i].push({ ...l, pos: oStart - sx, length: oEnd - oStart, mag, magEnd });
      }
    });
    cx += len;
  });

  let M_start = 0; 
  if (idxStart > 0) {
    for (let i = 0; i < idxStart; i++) {
       const distToSupport = spans.slice(i+1, idxStart).reduce((a,b)=>a+b, 0);
       spanLoads[i].forEach(l => {
         if (l.type === 'moment') {
             M_start += l.mag;
         } else {
             const { totalForce, momentA } = getLoadIntegral(l);
             const xc = totalForce !== 0 ? momentA / totalForce : 0;
             const arm = (spans[i] - xc) + distToSupport;
             M_start -= totalForce * arm; 
         }
       });
    }
  }
  let M_end = 0;
  if (idxEnd < spans.length) {
    for (let i = idxEnd; i < spans.length; i++) {
       const distToSupport = spans.slice(idxEnd, i).reduce((a,b)=>a+b, 0);
       spanLoads[i].forEach(l => {
         if (l.type === 'moment') {
             M_end -= l.mag; 
         } else {
             const { totalForce, momentA } = getLoadIntegral(l);
             const xc = totalForce !== 0 ? momentA / totalForce : 0;
             const arm = distToSupport + xc;
             M_end -= totalForce * arm;
         }
       });
    }
  }

  const numNodes = idxEnd - idxStart + 1;
  const nodeMoments = new Array(spans.length + 1).fill(0);
  
  if (numNodes <= 1) {
    if (idxStart === idxEnd) nodeMoments[idxStart] = M_start + M_end;
  } else {
    const matrixSize = numNodes;
    const A = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));
    const B = Array(matrixSize).fill(0);

    for (let k = 0; k < numNodes; k++) {
      const nodeIdx = idxStart + k;
      const supportType = supports[nodeIdx]; 
      const leftSpanIdx = nodeIdx - 1;
      const rightSpanIdx = nodeIdx;
      // ★[MODIFIED] High Precision CalcPhi
      const phiL_load = (leftSpanIdx >= idxStart) ? calcPhi(spans[leftSpanIdx], spanLoads[leftSpanIdx]).phiR : 0;
      const phiR_load = (rightSpanIdx < idxEnd) ? calcPhi(spans[rightSpanIdx], spanLoads[rightSpanIdx]).phiL : 0;

      if (k === 0) {
        if (supportType === 'fixed') {
          A[k][k] = 2 * spans[rightSpanIdx];
          if (numNodes > 1) A[k][k+1] = spans[rightSpanIdx];
          B[k] = -6 * phiR_load;
        } else {
          A[k][k] = 1; B[k] = M_start;
        }
      } else if (k === numNodes - 1) {
        if (supportType === 'fixed') {
          const len = spans[leftSpanIdx];
          A[k][k-1] = len; A[k][k] = 2 * len;
          B[k] = -6 * phiL_load;
        } else {
          A[k][k] = 1; B[k] = M_end;
        }
      } else {
        A[k][k-1] = spans[leftSpanIdx];
        A[k][k] = 2 * (spans[leftSpanIdx] + spans[rightSpanIdx]);
        A[k][k+1] = spans[rightSpanIdx];
        B[k] = -6 * (phiL_load + phiR_load);
      }
    }
    const M_solutions = solveLinearSystem(A, B);
    for(let k=0; k<numNodes; k++) {
      nodeMoments[idxStart + k] = M_solutions[k];
    }
  }

  const shearData = []; 
  const momentData = [];
  let globalX = 0;

  for (let i = 0; i < spans.length; i++) {
    const len = spans[i];
    const sLoads = spanLoads[i];
    const ML = nodeMoments[i];
    const MR = nodeMoments[i+1];

    const keyPoints = new Set([0, len]);
    sLoads.forEach(l => { 
        keyPoints.add(l.pos); 
        if (l.type === 'moment') {
            keyPoints.add(Math.max(0, l.pos - 1e-6));
            keyPoints.add(Math.min(len, l.pos + 1e-6));
        } else if(l.type !== 'point') {
            keyPoints.add(l.pos + l.length);
        }
    });
    
    // ★[MODIFIED] Graph generation pitch 5mm (200 steps/m) optimized for SVG
    // Limit total points per span to avoid rendering lag
    const steps = Math.max(50, Math.min(Math.ceil(len * 200), 2000));
    for(let k=0; k<=steps; k++) keyPoints.add(k * (len / steps));
    const sortedLx = Array.from(keyPoints).sort((a,b)=>a-b);

    let sumP=0, sumM=0;
    sLoads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
    const Rb_s = sumM/len; const Ra_s = sumP - Rb_s;

    sortedLx.forEach(lx => {
        const gx = globalX + lx;
        const Qb = (MR - ML) / len;
        
        const Q_left = getSectionForceSimple(lx, sLoads, Ra_s, 'left').Q + Qb;
        const Q_right = getSectionForceSimple(lx, sLoads, Ra_s, 'right').Q + Qb;
        
        shearData.push({ x: gx, y: Q_left });
        if (Math.abs(Q_left - Q_right) > 1e-6) {
            shearData.push({ x: gx, y: Q_right });
        }
        
        const Ms = getSectionForceSimple(lx, sLoads, Ra_s).M;
        const Mb = ML + (MR - ML) * (lx / len);
        momentData.push({ x: gx, y: Ms + Mb });
    });
    globalX += len;
  }

  const deflectionData = [];
  const rawIntegration = [];
  let curTh = 0, curY = 0;
  rawIntegration.push({ x: 0, th: 0, y: 0 });

  for (let j = 0; j < momentData.length - 1; j++) {
      const p1 = momentData[j], p2 = momentData[j+1];
      const dx = p2.x - p1.x;
      if (dx < 1e-8) continue;
      
      const phi1 = -(p1.y * 1e6) / (props.E * props.I);
      const phi2 = -(p2.y * 1e6) / (props.E * props.I);
      const dTh = (phi1 + phi2) * 0.5 * dx * 1000;
      const dY = (curTh + (curTh + dTh)) * 0.5 * dx * 1000;
      curTh += dTh; curY += dY;
      rawIntegration.push({ x: p2.x, th: curTh, y: curY });
  }

  let C1 = 0, C2 = 0;
  const getRaw = (x) => {
      const match = rawIntegration.find(p => Math.abs(p.x - x) < 1e-4);
      if (match) return match;
      const low = rawIntegration.filter(p => p.x <= x).pop();
      const high = rawIntegration.find(p => p.x > x);
      if (!low || !high) return low || high || { th: 0, y: 0 };
      const r = (x - low.x) / (high.x - low.x);
      return { th: low.th + (high.th - low.th) * r, y: low.y + (high.y - low.y) * r };
  };

  const supportPoints = [];
  let tx = 0;
  supports.forEach((s, i) => {
      if (s !== 'free') supportPoints.push({ x: tx, type: s });
      if (i < spans.length) tx += spans[i];
  });

  if (supportPoints.length > 0) {
      const firstS = supportPoints[0];
      if (firstS.type === 'fixed') {
          const raw = getRaw(firstS.x);
          C1 = -raw.th;
          C2 = -raw.y - C1 * firstS.x;
      } else if (supportPoints.length >= 2) {
          const s1 = supportPoints[0], s2 = supportPoints[supportPoints.length - 1];
          const r1 = getRaw(s1.x), r2 = getRaw(s2.x);
          C1 = -(r2.y - r1.y) / (s2.x - s1.x);
          C2 = -r1.y - C1 * s1.x;
      } else {
          const r1 = getRaw(firstS.x);
          C1 = 0; C2 = -r1.y;
      }
  }

  rawIntegration.forEach(p => {
      deflectionData.push({ x: p.x, y: p.y + C1 * p.x + C2 });
  });

  const spanBounds = [];
  let sx = 0;
  for (let i = 0; i < spans.length; i++) {
    const ex = sx + spans[i];
    
    const sLoads = spanLoads[i];
    let sumP=0, sumM=0;
    sLoads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
    const len = spans[i];
    const Rb_s = sumM/len; const Ra_s = sumP - Rb_s;
    const ML = nodeMoments[i]; const MR = nodeMoments[i+1];
    const Qb = (MR - ML) / len;

    const zeroCrossX = [];
    const checkStep = 50; 
    for(let k=0; k<checkStep; k++) {
        const x1 = (k/checkStep)*len;
        const x2 = ((k+1)/checkStep)*len;
        const Q1 = getSectionForceSimple(x1, sLoads, Ra_s).Q + Qb;
        const Q2 = getSectionForceSimple(x2, sLoads, Ra_s).Q + Qb;
        if(Q1 * Q2 < 0) {
             const x0 = x1 + (0 - Q1) * (x2 - x1) / (Q2 - Q1);
             zeroCrossX.push(x0);
        }
    }

    const sM_points = momentData.filter(d => d.x >= sx - EPS && d.x <= ex + EPS);
    const sQ_points = shearData.filter(d => d.x >= sx - EPS && d.x <= ex + EPS);
    const sD_points = deflectionData.filter(d => d.x >= sx - EPS && d.x <= ex + EPS);

    zeroCrossX.forEach(zx => {
        const gx = sx + zx;
        const res = getSectionForceSimple(zx, sLoads, Ra_s);
        const Mb = ML + (MR - ML) * (zx / len);
        const valM = res.M + Mb;
        sM_points.push({ x: gx, y: valM });
    });

    const maxM = Math.max(...sM_points.map(d => d.y)), minM = Math.min(...sM_points.map(d => d.y));
    const maxQ = Math.max(...sQ_points.map(d => d.y)), minQ = Math.min(...sQ_points.map(d => d.y));
    const maxD = Math.max(...sD_points.map(d => d.y)), minD = Math.min(...sD_points.map(d => d.y));

    spanBounds.push({
      spanIndex: i, 
      maxM, maxM_x: sM_points.find(d => d.y === maxM)?.x || sx,
      minM, minM_x: sM_points.find(d => d.y === minM)?.x || sx,
      maxQ, maxQ_x: sQ_points.find(d => d.y === maxQ)?.x || sx,
      minQ, minQ_x: sQ_points.find(d => d.y === minQ)?.x || sx,
      maxD, maxD_x: sD_points.find(d => d.y === maxD)?.x || sx,
      minD, minD_x: sD_points.find(d => d.y === minD)?.x || sx
    });
    sx = ex;
  }

  const reactions = [];
  validSupportIndices.forEach(idx => {
    let pos = 0; for(let k=0; k<idx; k++) pos += spans[k];
    let R_val = 0;

    if (idx > 0) {
        const i = idx - 1;
        const len = spans[i];
        const sLoads = spanLoads[i];
        let sumP=0, sumM=0;
        sLoads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
        const Rb_simple = sumM/len; 
        
        const ML = nodeMoments[i]; const MR = nodeMoments[i+1];
        const Q_mom = (MR - ML) / len; 
        R_val += (Rb_simple - Q_mom);
    }

    if (idx < spans.length) {
        const i = idx;
        const len = spans[i];
        const sLoads = spanLoads[i];
        let sumP=0, sumM=0;
        sLoads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
        const Rb_simple = sumM/len;
        const Ra_simple = sumP - Rb_simple;

        const ML = nodeMoments[i]; const MR = nodeMoments[i+1];
        const Q_mom = (MR - ML) / len;
        
        R_val += (Ra_simple + Q_mom);
    }
    
    reactions.push({ x: pos, val: R_val, label: String.fromCharCode(65+idx) });
  });

  const maxM_pos = Math.max(0, ...momentData.map(d=>d.y));
  const maxM_neg = Math.min(0, ...momentData.map(d=>d.y));

  return {
    shearData, momentData, deflectionData, spanBounds, reactions,
    // ★[MODIFIED] Added Raw Data for Exact Analytical Calculation
    raw: { spans, spanLoads, nodeMoments, supports },
    bounds: { 
      maxShear: Math.max(...shearData.map(d=>Math.abs(d.y))), maxShear_x: 0,
      maxM_pos, maxM_pos_x: momentData.find(d=>d.y===maxM_pos)?.x || 0,
      maxM_neg, maxM_neg_x: momentData.find(d=>d.y===maxM_neg)?.x || 0,
      maxDeflection: Math.max(...deflectionData.map(d=>Math.abs(d.y))), 
      maxDef_x: deflectionData.find(d=>Math.abs(d.y) === Math.max(...deflectionData.map(v=>Math.abs(v.y))))?.x || 0,
      maxSigma_pos: maxM_pos * 1e6 / props.Z,
      maxSigma_neg: maxM_neg * 1e6 / props.Z
    },
  };
}

// ★[MODIFIED] Result Retrieval Logic (Exact Analysis & Support Correction)
export function getResultAt(x, results, props, targetSpanIndex = -1) {
    if (!results.momentData) return {};

    // 1. Analytical Calculation for Forces (Q, M, Sigma)
    if (results.raw) {
        const { spans, spanLoads, nodeMoments, supports } = results.raw;
        let currentX = 0;
        let spanIndex = -1;
        let localX = 0;

        // ★[MODIFIED] Span enforcement logic
        if (targetSpanIndex !== -1 && targetSpanIndex >= 0 && targetSpanIndex < spans.length) {
            for(let k=0; k<targetSpanIndex; k++) currentX += spans[k];
            spanIndex = targetSpanIndex;
            localX = x - currentX;
            // Force localX to be within bounds (handle precision errors)
            if(localX < 0 && localX > -0.001) localX = 0;
            if(localX > spans[spanIndex] && localX < spans[spanIndex] + 0.001) localX = spans[spanIndex];
        } else {
            // Auto detection (fallback)
            for(let i=0; i<spans.length; i++) {
                if (x >= currentX - 1e-9 && x <= currentX + spans[i] + 1e-9) {
                    spanIndex = i;
                    localX = x - currentX;
                    if(localX < 0) localX = 0;
                    if(localX > spans[i]) localX = spans[i];
                    break;
                }
                currentX += spans[i];
            }
        }

        if (spanIndex !== -1) {
            const len = spans[spanIndex];
            const loads = spanLoads[spanIndex];
            const ML = nodeMoments[spanIndex];
            const MR = nodeMoments[spanIndex + 1];

            // Simple Beam Reaction for this span
            let sumP=0, sumM=0;
            loads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
            const Rb_simple = sumM/len;
            const Ra_simple = sumP - Rb_simple;

            // Superposition
            // ★[MODIFIED] Use side='right' to include point loads/moments at the exact location
            const simpleRes = getSectionForceSimple(localX, loads, Ra_simple, 'right');
            const Qb = (MR - ML) / len;
            const Mb = ML + (MR - ML) * (localX / len);
            
            const totalQ = simpleRes.Q + Qb;
            let totalM = simpleRes.M + Mb;

            // ★[PATCH] 右端における集中モーメント荷重の補正 (v21.17 Modified)
            // 右端がフリーまたは単純支持(pin/roller)のときで右端に集中モーメントが作用するときに、結果表の右端のモーメント表示を補正する
            // (ユーザー指示により、このブロックは維持する)
            const totalLen = spans.reduce((a,b)=>a+b, 0);
            const rightSupport = supports[supports.length - 1];
            
            // 対象となる支持条件: free, pin, roller (右端単純支持も含む)
            const isTargetSupport = ['free', 'pin', 'roller'].includes(rightSupport);

            if (Math.abs(x - totalLen) < 0.001 && isTargetSupport) {
                const lastSpanIdx = spans.length - 1;
                const lastSpanLoads = spanLoads[lastSpanIdx];
                const lastSpanLen = spans[lastSpanIdx];
                
                let endMomentSum = 0;
                lastSpanLoads.forEach(l => {
                    // ローカル座標でスパン終端にあるモーメント荷重を探す
                    if (l.type === 'moment' && Math.abs(l.pos - lastSpanLen) < 0.001) {
                        endMomentSum += l.mag;
                    }
                });
                
                // 右端に作用する集中モーメントの合計の逆の符号を加算
                if (endMomentSum !== 0) {
                    totalM += (-endMomentSum);
                }
            }

            // 2. Deflection (Graph Interpolation + Support Zero Correction)
            let defVal = 0;
            if (results.deflectionData) {
                 const arr = results.deflectionData;
                 const match = arr.find(p => Math.abs(p.x - x) < 1e-4);
                 if (match) defVal = match.y;
                 else {
                     const low = arr.filter(p => p.x <= x).pop();
                     const high = arr.find(p => p.x > x);
                     if (low && high) {
                         defVal = low.y + (high.y - low.y) * ((x - low.x)/(high.x - low.x));
                     } else {
                         defVal = low ? low.y : (high ? high.y : 0);
                     }
                 }
            }

            // Force Zero Deflection at Supports (±1mm tolerance)
            let supX = 0;
            let isNearSupport = false;
            for(let i=0; i<supports.length; i++) {
                if (supports[i] !== 'free') {
                    if (Math.abs(x - supX) < 0.001) {
                        isNearSupport = true;
                        break;
                    }
                }
                if (i < spans.length) supX += spans[i];
            }
            if (isNearSupport) defVal = 0;

            return {
                Q: totalQ,
                M: totalM,
                deflection: defVal,
                sigma: Math.abs(totalM * 1e6 / props.Z)
            };
        }
    }

    // Fallback logic (Graph Lookup)
    const getVal = (arr) => {
        if (!arr || arr.length === 0) return 0;
        const match = arr.find(p => Math.abs(p.x - x) < 1e-4);
        if (match) return match.y;
        const low = arr.filter(p => p.x <= x).pop();
        const high = arr.find(p => p.x > x);
        if (low && high) {
             return low.y + (high.y - low.y) * ((x - low.x)/(high.x - low.x));
        }
        return low ? low.y : (high ? high.y : 0);
    };
    const M = getVal(results.momentData);
    return {
        Q: getVal(results.shearData),
        M: M,
        deflection: getVal(results.deflectionData),
        sigma: Math.abs(M * 1e6 / props.Z)
    };
}

export function getSectionForceSimple(x, loads, Ra, side='left') {
  let Q = Ra, M = Ra * x;
  loads.forEach(l => {
    if (l.pos > x + EPS) return;
    if ((l.type === 'point' || l.type === 'moment') && Math.abs(l.pos - x) < EPS && side === 'left') return;
    let endPos = l.pos + l.length, effectiveLen = Math.max(0, Math.min(x, endPos) - l.pos);
    if (effectiveLen < EPS && l.type !== 'point' && l.type !== 'moment') return;
    let pLoad = { ...l, length: effectiveLen };
    if (l.type === 'trapezoid') pLoad.magEnd = l.mag + (l.magEnd - l.mag) * effectiveLen / l.length;
    
    if (l.type === 'moment') {
        M += l.mag; 
    } else {
        const r = getLoadIntegral(pLoad);
        Q -= r.totalForce; M -= (x * r.totalForce - r.momentA);
    }
  });
  return { Q, M };
}

export function getLoadIntegral(l) {
  if (l.type === 'point') return { totalForce: l.mag, momentA: l.mag * l.pos };
  if (l.type === 'moment') return { totalForce: 0, momentA: l.mag }; 
  const w1=l.mag, w2=l.type==='trapezoid'?l.magEnd:l.mag, L=l.length;
  if (L <= 0) return { totalForce: 0, momentA: 0 };
  const F = L*(w1+w2)/2, distC = (w1+w2)===0 ? L/2 : (L/3) * (w1 + 2*w2) / (w1+w2); 
  return { totalForce: F, momentA: F * (l.pos + distC) };
}

export function calcPhi(L, loads) {
  let phiL = 0, phiR = 0; 
  // ★[MODIFIED] Optimized Integration Step (1mm pitch = 1000 steps/m)
  const stepsPerMeter = 1000;
  // Cap max steps to prevent freezing on long spans
  const N = Math.min(Math.max(50, Math.ceil(L * stepsPerMeter)), 10000); 
  const dx = L/N;
  let sumP=0, sumM=0; loads.forEach(l=>{ const r=getLoadIntegral(l); sumP+=r.totalForce; sumM+=r.momentA; });
  const Rb = sumM/L, Ra = sumP - Rb;
  for(let i=0; i<N; i++) {
    const x = (i+0.5)*dx, M = getSectionForceSimple(x, loads, Ra).M;
    phiL += (M * (L-x)/L) * dx; phiR += (M * x/L) * dx;
  }
  return { phiL, phiR };
}

export function solveLinearSystem(A, B) {
  const n = B.length;
  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(A[i][i]), maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > maxEl) { maxEl = Math.abs(A[k][i]); maxRow = k; }
    for (let k = i; k < n; k++) [A[maxRow][k], A[i][k]] = [A[i][k], A[maxRow][k]];
    [B[maxRow], B[i]] = [B[i], B[maxRow]];
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) A[k][j] = (i === j ? 0 : A[k][j] + c * A[i][j]);
      B[k] += c * B[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i > -1; i--) {
    let sum = 0; for (let k = i + 1; k < n; k++) sum += A[i][k] * x[k];
    x[i] = (B[i] - sum) / A[i][i];
  }
  return x;
}

export function generateEmptyResult() {
  return { shearData:[], momentData:[], deflectionData:[], poiResults:[], spanBounds:[], reactions:[], bounds:{ maxShear:0, maxM_pos:0, maxM_neg:0, maxDeflection:0, maxSigma_pos:0, maxSigma_neg:0 } };
}
