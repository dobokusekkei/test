import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Plus, Trash2, Activity, Settings, List, X, Layers, ChevronDown, ArrowRight, RotateCw, AlertTriangle, Save, FolderOpen, Printer, Edit3, HelpCircle, History, FileDown, Upload, ExternalLink } from 'lucide-react';

import { INITIAL_SPAN, E_STEEL, STEEL_LISTS, CONCRETE_STRENGTHS, BEAM_TYPES, RESOLUTION } from './constants.js';
import { solveGeneralBeam, getSteelProps, normalizeText, generateEmptyResult, getResultAt } from './logic.js';
import { HelpModal, VersionHistoryModal, PoiTable, ResultWindow, ResultContent, AdvancedVisualizer, PrintReport, SectionProfileView, ResultBox } from './components.jsx';

function App() {
  // --- States ---
  const [spanStr, setSpanStr] = useState(INITIAL_SPAN);
  const [beamType, setBeamType] = useState('simple');
  const [loads, setLoads] = useState([{ id: 1, type: 'point', mag: 10, pos: 3, length: 0 }]);
  const [showHelp, setShowHelp] = useState(false); // Help Modal State
  const [showHistory, setShowHistory] = useState(false); // Version History Modal State
  const [showResultWindow, setShowResultWindow] = useState(false);
    
  // ★[MODIFIED] matType: steel | concrete | manual
  const [matType, setMatType] = useState('steel');
  const [steelShape, setSteelShape] = useState('H');
  const [steelProfileIdx, setSteelProfileIdx] = useState(9); 
  const [steelAxis, setSteelAxis] = useState('strong');
    
  // New: Manual Input States
  const [manualI, setManualI] = useState("1000"); // cm4
  const [manualZ, setManualZ] = useState("100");  // cm3
  const [manualA, setManualA] = useState("30.0"); // cm2
  const [manualE, setManualE] = useState("205"); // kN/mm2 (205000 N/mm2)
    
  const [effI, setEffI] = useState("1.0"); 
  const [effZ, setEffZ] = useState("1.0");
  const [wallLength, setWallLength] = useState("1.0"); // 施工延長(m)

  const [rcFcIdx, setRcFcIdx] = useState(1);
  const [rcWidthStr, setRcWidthStr] = useState('300');
  const [rcDepthStr, setRcDepthStr] = useState('600');

  const [userPoi, setUserPoi] = useState([]); 

  const [newLoadType, setNewLoadType] = useState('point');
  const [newMagStart, setNewMagStart] = useState(10);
  const [newMagEnd, setNewMagEnd] = useState(10);
  const [newPos, setNewPos] = useState(0);
  const [newLength, setNewLength] = useState(2);

  const [calcError, setCalcError] = useState(null);

  const fileInputRef = useRef(null);

  // --- 解析モデルの計算 ---
  const { spans, totalLength, supports } = useMemo(() => {
    const vals = normalizeText(spanStr).replace(/,/g, ' ').split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    const safeVals = vals.length > 0 ? vals : [6.0];
    let s = safeVals;
    let supp = [];

    switch (beamType) {
      case 'simple': s = [safeVals[0]]; supp = ['pin', 'roller']; break;
      case 'fixed': s = [safeVals[0]]; supp = ['fixed', 'fixed']; break;
      case 'cantilever': s = [safeVals[0]]; supp = ['fixed', 'free']; break;
      case 'overhang_one': 
        if(s.length < 2) s = [s[0], s[0]*0.3]; 
        s = s.slice(0, 2); supp = ['pin', 'roller', 'free']; break;
      case 'overhang_both': 
        if(s.length < 3) { const main = s.length>=2?s[1]:s[0]; const sub = s.length>=1?s[0]:2.0; s = [sub, main, sub]; }
        s = s.slice(0, 3); supp = ['free', 'pin', 'roller', 'free']; break;
      case 'continuous2': 
        if(s.length < 2) s = [s[0], s[0]];
        s = s.slice(0, 2); supp = ['pin', 'roller', 'roller']; break;
      case 'continuous2_overhang': 
        if(s.length < 3) s = [s[0], s[0], s[0]*0.3];
        s = s.slice(0, 3); supp = ['pin', 'roller', 'roller', 'free']; break;
      case 'continuous3': 
        if(s.length < 3) s = [s[0], s[0], s[0]];
        s = s.slice(0, 3); supp = ['pin', 'roller', 'roller', 'roller']; break;
      default: s = [6.0]; supp = ['pin', 'roller'];
    }
    return { spans: s, totalLength: s.reduce((a,b)=>a+b, 0), supports: supp };
  }, [spanStr, beamType]);

  // --- 断面性能の取得 ---
  const sectionProps = useMemo(() => {
    let E = 0, I = 0, Z = 0, label = '', dims = {}, A = 0, w = 0;
    
    // ★[MODIFIED] Manual Mode Logic
    if (matType === 'manual') {
        const iVal = parseFloat(manualI);
        const zVal = parseFloat(manualZ);
        const aVal = parseFloat(manualA);
        const eVal = parseFloat(manualE);

        I = (isNaN(iVal) ? 0 : iVal) * 10000; // cm4 -> mm4
        Z = (isNaN(zVal) ? 0 : zVal) * 1000;  // cm3 -> mm3
        A = (isNaN(aVal) ? 0 : aVal);         // cm2
        E = (isNaN(eVal) ? 0 : eVal) * 1000;  // kN/mm2 -> N/mm2

        w = A * 0.785; // Default assumption for weight calc (Steel approx)
        label = `任意断面 (I=${manualI}, Z=${manualZ})`;
        dims = { type: 'manual' }; 
    
    } else if (matType === 'steel') {
      E = E_STEEL; 
      const list = STEEL_LISTS[steelShape];
      const name = list[steelProfileIdx] || list[0];
      const props = getSteelProps(steelShape, name, steelAxis);
      dims = props;

      if (steelShape.includes('SheetPile')) {
          const wVal = parseFloat(wallLength);
          const safeWL = (isNaN(wVal) || wVal <= 0) ? 1.0 : wVal;
          const iVal = parseFloat(effI);
          const safeEffI = (isNaN(iVal) || iVal < 0) ? 1.0 : iVal;
          const zVal = parseFloat(effZ);
          const safeEffZ = (isNaN(zVal) || zVal < 0) ? 1.0 : zVal;

          I = props.I * safeEffI * safeWL;
          Z = props.Z * safeEffZ * safeWL;
          A = props.A * safeWL;
          w = props.w * safeWL;
          label = `${name} (L=${safeWL}m)`;
      } else {
          I = props.I; 
          Z = props.Z;
          A = props.A;
          w = props.w;
          label = `${name} (${steelAxis === 'strong' ? '強軸' : '弱軸'})`;
      }

    } else {
      const fcData = CONCRETE_STRENGTHS[rcFcIdx];
      const b = parseFloat(rcWidthStr) || 0;
      const D = parseFloat(rcDepthStr) || 0;
      E = fcData.Ec; I = (b * Math.pow(D, 3)) / 12; Z = (b * Math.pow(D, 2)) / 6; 
      dims = { H: D, B: b, type: 'RC' };
      const areaM2 = (b/1000)*(D/1000);
      A = areaM2 * 10000; // cm2
      w = areaM2 * 2400; // kg/m
      label = `RC造 ${fcData.label} ${b}x${D}`;
    }
    return { E, I, Z, label, dims, shape: steelShape, axis: steelAxis, matType, effI, effZ, wallLength, A, w };
  }, [matType, steelShape, steelProfileIdx, steelAxis, rcFcIdx, rcWidthStr, rcDepthStr, effI, effZ, wallLength, manualI, manualZ, manualA, manualE]);

  // --- 構造解析実行 ---
  const results = useMemo(() => {
    try {
      setCalcError(null);
      return solveGeneralBeam(spans, supports, loads, RESOLUTION, sectionProps);
    } catch (e) {
      console.error(e);
      setCalcError("解析エンジンでエラーが発生しました。入力を確認してください。");
      return generateEmptyResult();
    }
  }, [spans, supports, loads, sectionProps]);

  // --- 自動着目点(POI)の算出 ---
  const autoPoiPoints = useMemo(() => {
    if(!results.bounds) return [];
    
    // ★Fix: 座標の丸め関数 (3桁精度で管理して数値誤差による重複を防ぐ)
    const R = (v) => Math.round(v * 1000) / 1000;
    const points = new Set();
    
    points.add(R(0));
    points.add(R(totalLength));
    
    let cx = 0;
    spans.forEach(s => { cx += s; points.add(R(cx)); });

    loads.forEach(l => {
        points.add(R(l.pos));
        // ★[MODIFIED] Add discontinuity points for Moment load
        if (l.type === 'moment') {
            points.add(R(Math.max(0, l.pos - 1e-6)));
            points.add(R(Math.min(totalLength, l.pos + 1e-6)));
        } else if(l.type !== 'point') {
            points.add(R(l.pos + l.length));
        }
    });

    if (results.bounds) {
        const b = results.bounds;
        [b.maxShear_x, b.maxM_pos_x, b.maxM_neg_x, b.maxDef_x].forEach(x => { if (x !== undefined) points.add(R(x)); });
    }
    if (results.spanBounds) {
        results.spanBounds.forEach(sb => {
            [sb.maxM_x, sb.minM_x, sb.maxQ_x, sb.minQ_x, sb.maxD_x, sb.minD_x].forEach(x => { if (x !== undefined) points.add(R(x)); });
        });
    }

    // ゼロクロス点の追加
    const findZeroCrossings = (data) => {
        const crossings = [];
        if (!data) return crossings;
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i].y * data[i+1].y < -1e-6) {
                const x = data[i].x + (0 - data[i].y) * (data[i+1].x - data[i].x) / (data[i+1].y - data[i].y);
                crossings.push(x);
            } 
            else if (Math.abs(data[i].y) < 1e-6) {
                const prevY = data[i-1].y;
                const nextY = data[i+1].y;
                if (Math.abs(prevY) > 1e-4 || Math.abs(nextY) > 1e-4) crossings.push(data[i].x);
            }
        }
        return crossings;
    };
    findZeroCrossings(results.momentData).forEach(x => points.add(R(x)));
    findZeroCrossings(results.shearData).forEach(x => points.add(R(x)));

    return Array.from(points)
      .filter(p => p >= 0 && p <= totalLength)
      .sort((a, b) => a - b);
  }, [totalLength, spans.join(','), loads, results.bounds]);

  // ★[MODIFIED] 最終的なPOIリスト（自動 + ユーザー）の作成
  const finalPoiData = useMemo(() => {
      const merged = [];
      // 自動点
      autoPoiPoints.forEach(x => merged.push({ type: 'auto', x, id: `auto-${x}` }));
      // ユーザー点
      userPoi.forEach(p => merged.push({ type: 'user', x: p.x, id: p.id }));
      
      // ソートして値を計算
      return merged.sort((a,b) => a.x - b.x).map(p => {
          return { ...p, res: {} }; // getResultAt is called inside PoiTable to isolate spans
      });
  }, [autoPoiPoints, userPoi, results, sectionProps]);

  // --- CSV Export Logic (v21.29 NEW) ---
  const exportToCSV = () => {
    // BOM付与 (Excel文字化け対策)
    let csvContent = "\uFEFF";
    
    // Header
    csvContent += `[INFO],Version,21.29,Date,${new Date().toLocaleDateString()}\n`;
    
    // Inputs (Wrap strings with quotes to handle commas)
    csvContent += `[INPUT_BASIC],SpanStr,"${spanStr}",BeamType,${beamType},MatType,${matType}\n`;
    
    // ★[MODIFIED] Output only relevant material inputs based on matType
    if (matType === 'steel') {
        csvContent += `[INPUT_STEEL],Shape,${steelShape},ProfileIdx,${steelProfileIdx},Axis,${steelAxis}\n`;
        // Pile inputs are part of steel group if selected
        if (steelShape.includes('SheetPile')) {
            csvContent += `[INPUT_PILE],EffI,${effI},EffZ,${effZ},WallLength,${wallLength}\n`;
        }
    } else if (matType === 'manual') {
        csvContent += `[INPUT_MANUAL],I,${manualI},Z,${manualZ},A,${manualA},E,${manualE}\n`;
    } else if (matType === 'concrete') {
        csvContent += `[INPUT_RC],FcIdx,${rcFcIdx},Width,${rcWidthStr},Depth,${rcDepthStr}\n`;
    }
    
    // Loads
    csvContent += `[HEADER_LOAD],Id,Type,Mag,Pos,Length,MagEnd\n`;
    loads.forEach(l => {
        csvContent += `[LOAD],${l.id},${l.type},${l.mag},${l.pos},${l.length},${l.magEnd || 0}\n`;
    });

    // User POI
    csvContent += `[HEADER_POI],Id,x\n`;
    userPoi.forEach(p => {
        csvContent += `[USER_POI],${p.id},${p.x}\n`;
    });

    // Results Summary (For Record)
    csvContent += `[HEADER_RESULT],Section,Item,Value,Unit,LocationX\n`;
    
    // Section Properties
    csvContent += `[SECTION_PROPS],Label,"${sectionProps.label}",I(mm4),${sectionProps.I},Z(mm3),${sectionProps.Z},E(N/mm2),${sectionProps.E},A(cm2),${sectionProps.A},w(kg/m),${sectionProps.w}\n`;

    // ★[MODIFIED] Reactions
    results.reactions.forEach(r => {
        csvContent += `[RESULT_REACTION],${r.label},${r.val.toFixed(2)},kN,${r.x.toFixed(3)}\n`;
    });

    // ★[MODIFIED] Span-by-Span Bounds (Max/Min)
    if (results.spanBounds) {
        csvContent += `[HEADER_SPAN_BOUNDS],SpanIdx,Length,Item,Value,Unit,LocalX,GlobalX\n`;
        results.spanBounds.forEach(sb => {
            const offset = spans.slice(0, sb.spanIndex).reduce((a, b) => a + b, 0);
            const idx = sb.spanIndex + 1;
            const len = spans[sb.spanIndex];
            
            // Max M
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxM_Pos,${sb.maxM},kN.m,${(sb.maxM_x - offset).toFixed(3)},${sb.maxM_x}\n`;
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxM_Neg,${sb.minM},kN.m,${(sb.minM_x - offset).toFixed(3)},${sb.minM_x}\n`;
            // Max Q
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxQ_Pos,${sb.maxQ},kN,${(sb.maxQ_x - offset).toFixed(3)},${sb.maxQ_x}\n`;
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxQ_Neg,${sb.minQ},kN,${(sb.minQ_x - offset).toFixed(3)},${sb.minQ_x}\n`;
            // Max D
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxD_Pos,${sb.maxD},mm,${(sb.maxD_x - offset).toFixed(3)},${sb.maxD_x}\n`;
            csvContent += `[SPAN_BOUNDS],${idx},${len},MaxD_Neg,${sb.minD},mm,${(sb.minD_x - offset).toFixed(3)},${sb.minD_x}\n`;
        });
    }

    // ★[MODIFIED] Span-by-Span Detailed Results
    csvContent += `[HEADER_SPAN_DETAIL],SpanIdx,Type,LocalX(m),GlobalX(m),Q(kN),M(kN.m),Sigma(N/mm2),Deflection(mm)\n`;
    
    // Group points by span to output in order
    let currentX = 0;
    spans.forEach((len, sIdx) => {
        const rangeStart = currentX;
        const rangeEnd = currentX + len;
        
        // Find points in this span (inclusive of boundaries)
        const spanPoints = finalPoiData.filter(p => p.x >= rangeStart - 1e-4 && p.x <= rangeEnd + 1e-4);
        
        spanPoints.forEach(p => {
            const localX = Math.max(0, Math.min(len, p.x - rangeStart));
            // Force recalculation for this specific span index to handle discontinuities correctly
            const r = getResultAt(p.x, results, sectionProps, sIdx);
            
            csvContent += `[SPAN_DETAIL],${sIdx+1},${p.type},${localX.toFixed(3)},${p.x.toFixed(3)},${(r.Q||0).toFixed(3)},${(r.M||0).toFixed(3)},${(r.sigma||0).toFixed(2)},${(r.deflection||0).toFixed(3)}\n`;
        });
        
        currentX += len;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `structural_calc_result_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- CSV Import Logic (v21.29 NEW) ---
  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    
    // Helper to parse CSV lines considering quotes (Fix for comma inside value)
    const parseCSVLine = (text) => {
        const result = [];
        let curr = '';
        let inQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                result.push(curr);
                curr = '';
            } else {
                curr += char;
            }
        }
        result.push(curr);
        return result.map(s => s.trim().replace(/^"|"$/g, '')); // 前後の空白と引用符を除去
    };

    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/);
            
            const newLoads = [];
            const newUserPoi = [];
            let hasInput = false;
            
            lines.forEach(line => {
                // Ignore empty lines
                if (!line.trim()) return;
                
                const cols = parseCSVLine(line);
                if(cols.length < 2) return;
                const tag = cols[0];
                
                // Only process input tags
                if(tag === '[INPUT_BASIC]') {
                    hasInput = true;
                    // SpanStr,val,BeamType,val,MatType,val
                    setSpanStr(cols[2]);
                    setBeamType(cols[4]);
                    setMatType(cols[6]);
                } else if (tag === '[INPUT_STEEL]') {
                    setSteelShape(cols[2]);
                    setSteelProfileIdx(Number(cols[4]));
                    setSteelAxis(cols[6]);
                } else if (tag === '[INPUT_MANUAL]') {
                    setManualI(cols[2]);
                    setManualZ(cols[4]);
                    setManualA(cols[6]);
                    setManualE(cols[8]);
                } else if (tag === '[INPUT_RC]') {
                    setRcFcIdx(Number(cols[2]));
                    setRcWidthStr(cols[4]);
                    setRcDepthStr(cols[6]);
                } else if (tag === '[INPUT_PILE]') {
                    setEffI(cols[2]);
                    setEffZ(cols[4]);
                    setWallLength(cols[6]);
                } else if (tag === '[LOAD]') {
                    newLoads.push({
                        id: Number(cols[1]),
                        type: cols[2],
                        mag: Number(cols[3]),
                        pos: Number(cols[4]),
                        length: Number(cols[5]),
                        magEnd: Number(cols[6])
                    });
                } else if (tag === '[USER_POI]') {
                    newUserPoi.push({
                        id: Number(cols[1]),
                        x: Number(cols[2])
                    });
                }
            });
            
            if (hasInput) {
                setLoads(newLoads);
                setUserPoi(newUserPoi);
                setCalcError(null);
            } else {
                setCalcError("有効な入力データが見つかりませんでした。");
            }
        } catch (err) {
            console.error(err);
            setCalcError("ファイルの解析に失敗しました。正しいCSV形式ではありません。");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const addLoad = () => {
    const id = Date.now();
    let safePos = Math.max(0, Math.min(totalLength, Number(newPos)));
    let safeLength = Math.max(0, Number(newLength));
    if ((newLoadType === 'distributed' || newLoadType === 'trapezoid') && safePos + safeLength > totalLength) {
      safeLength = totalLength - safePos;
    }
    setLoads([...loads, {
      id, type: newLoadType, mag: Number(newMagStart), pos: safePos, length: safeLength,
      magEnd: newLoadType === 'trapezoid' ? Number(newMagEnd) : (newLoadType === 'distributed' ? Number(newMagStart) : 0)
    }]);
  };

  const handleTypeChange = (newType) => {
    setBeamType(newType);
    if(newType.includes('continuous3') && spanStr.indexOf(',')===-1) setSpanStr("5.0, 5.0, 5.0");
    else if(newType.includes('continuous2') && spanStr.indexOf(',')===-1) setSpanStr("5.0, 5.0");
    else if(newType.includes('overhang_one') && spanStr.indexOf(',')===-1) setSpanStr("6.0, 2.0");
    else if(newType.includes('overhang_both') && spanStr.indexOf(',')===-1) setSpanStr("2.0, 6.0, 2.0");
  };

  const handlePrint = () => {
      const reportHtml = renderToStaticMarkup(
          <PrintReport 
              params={{ 
                  spanStr, beamType, loads, matType, 
                  sectionProps, results, finalPoiData, 
                  spans, totalLength, supports 
              }} 
          />
      );

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
          return;
      }

      const htmlContent = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>構造計算書 - 印刷プレビュー</title>
              <script src="https://cdn.tailwindcss.com"><\/script>
              <style>
                  body { font-family: 'Helvetica Neue', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  @page { size: A4 portrait; margin: 10mm; }
                  @media print {
                      .no-print { display: none; }
                      h2 { break-before: auto; }
                      .page-break { break-before: page; }
                      .avoid-break { page-break-inside: avoid; }
                  }
                  .container { max-width: 190mm; margin: 0 auto; background: white; padding: 5mm; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                  @media screen {
                      body { background: #f1f5f9; padding: 20px; }
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  ${reportHtml}
              </div>
              <script>
                  window.onload = () => {
                      setTimeout(() => {
                          window.print();
                      }, 800);
                  };
              <\/script>
          </body>
          </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="no-print p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Header */}
            <div className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                構造計算アプリ Pro <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-1 rounded">v21.30</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">任意断面入力・モーメント荷重対応・不連続点自動補正</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><History className="w-4 h-4 text-blue-500" />履歴</button>
                <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><HelpCircle className="w-4 h-4 text-blue-500" />ヘルプ</button>
                <button onClick={() => setShowResultWindow(!showResultWindow)} className={`flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold shadow-sm transition-all ${showResultWindow ? 'bg-blue-100 text-blue-700 border-blue-400' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <ExternalLink className="w-4 h-4" />別窓結果
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all"><Printer className="w-4 h-4" />印刷</button>
                
                {/* ★[MODIFIED] 結果出力(CSV)ボタン & 読込ボタンの変更 */}
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><FileDown className="w-4 h-4" />結果出力(CSV)</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><Upload className="w-4 h-4" />読込(CSV)</button>
                <input type="file" ref={fileInputRef} accept=".csv" onChange={importFromCSV} className="hidden" />
            </div>
            </div>

            {/* Help Modal Render */}
            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
            {/* Version History Modal Render */}
            {showHistory && <VersionHistoryModal onClose={() => setShowHistory(false)} />}

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400" />モデル・荷重</h2>
                <div className="space-y-4 mb-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">梁タイプ</label>
                    <select value={beamType} onChange={(e) => handleTypeChange(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm">
                    {Object.entries(BEAM_TYPES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">スパン長さ (m)</label>
                    <input type="text" value={spanStr} onChange={e=>setSpanStr(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="例: 6.0"/>
                    <p className="text-[10px] text-slate-400 mt-1">{BEAM_TYPES[beamType]?.hint || 'カンマ区切りで複数入力可'}</p>
                </div>
                </div>
                <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-slate-600 mb-3">荷重追加</h3>
                {/* ★[MODIFIED] Added 'moment' to load types */}
                <div className="flex bg-slate-100 p-1 rounded mb-4">{['point', 'distributed', 'trapezoid', 'moment'].map(type => (<button key={type} onClick={() => setNewLoadType(type)} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${newLoadType === type ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{type === 'point' ? '集中' : type === 'distributed' ? '等分布' : type === 'trapezoid' ? '台形' : 'モーメント'}</button>))}</div>
                <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                    <div className="w-1/2"><label className="text-xs text-slate-500 block">荷重{newLoadType!=='point' && newLoadType!=='moment' && '(始)'}</label><input type="number" value={newMagStart} onChange={e=>setNewMagStart(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
                    {newLoadType==='trapezoid' && <div className="w-1/2"><label className="text-xs text-slate-500 block">荷重(終)</label><input type="number" value={newMagEnd} onChange={e=>setNewMagEnd(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>}
                    </div>
                    <div className="flex gap-2">
                    <div className="w-1/2"><label className="text-xs text-slate-500 block">位置 x</label><input type="number" value={newPos} onChange={e=>setNewPos(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
                    {newLoadType!=='point' && newLoadType!=='moment' && <div className="w-1/2"><label className="text-xs text-slate-500 block">長さ L</label><input type="number" value={newLength} onChange={e=>setNewLength(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>}
                    </div>
                    {newLoadType === 'moment' && <p className="text-[10px] text-slate-400">※時計回りを正(+)として入力</p>}
                </div>
                <button onClick={addLoad} className="w-full py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> 荷重を追加</button>
                </div>
                <div className="mt-4 space-y-1 max-h-[150px] overflow-y-auto text-sm">
                {loads.map(l => (
                    <div key={l.id} className="flex justify-between items-center p-2 bg-slate-50 border rounded">
                    <div className="flex flex-col"><span className="font-bold text-slate-700">{l.type==='point' ? `P=${l.mag}kN` : l.type==='moment' ? `M=${l.mag}kN·m` : `w=${l.mag}kN/m`}</span><span className="text-xs text-slate-500">x={l.pos}m {l.type!=='point' && l.type!=='moment' && `(L=${l.length})`}</span></div>
                    <button onClick={()=>setLoads(loads.filter(x=>x.id!==l.id))}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500"/></button>
                    </div>
                ))}
                </div>
            </div>

 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-slate-400" />断面・材料設定</h2>
                
                {/* ★[MODIFIED] Material Type Selector */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button onClick={() => setMatType('steel')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${matType === 'steel' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>S造</button>
                    <button onClick={() => setMatType('concrete')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${matType === 'concrete' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>RC造</button>
                    <button onClick={() => setMatType('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${matType === 'manual' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>任意</button>
                </div>

                {matType === 'steel' && (
                <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">鋼材種別</label>
                        <select value={steelShape} onChange={e => { setSteelShape(e.target.value); setSteelProfileIdx(0); }} className="w-full p-2 border rounded text-sm">
                            <option value="H">H形鋼</option>
                            <option value="Channel">溝形鋼</option>
                            <option value="LipChannel">C形鋼</option>
                            <option value="Angle">山形鋼</option>
                            <option value="SheetPile">鋼矢板 (U形)</option>
                            <option value="SheetPileW">鋼矢板 (広幅/w)</option>
                            <option value="SheetPileH">鋼矢板 (ハット形)</option>
                            <option value="LightSheetPile">軽量鋼矢板</option>
                            <option value="SquarePipe">角形鋼管 (Square Pipe)</option>
                        </select>
                    </div>
                    <div><label className="text-xs text-slate-500 font-bold block mb-1">断面サイズ</label><select value={steelProfileIdx} onChange={e => setSteelProfileIdx(Number(e.target.value))} className="w-full p-2 border rounded text-sm font-mono">{STEEL_LISTS[steelShape].map((name, idx) => <option key={idx} value={idx}>{name}</option>)}</select></div>
                    {(!steelShape.includes('SheetPile') && !steelShape.includes('SquarePipe')) && (
                        <div className="flex bg-slate-50 border rounded p-1"><button onClick={() => setSteelAxis('strong')} className={`flex-1 text-xs py-1 rounded font-bold ${steelAxis === 'strong' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>強軸 (X)</button><button onClick={() => setSteelAxis('weak')} className={`flex-1 text-xs py-1 rounded font-bold ${steelAxis === 'weak' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>弱軸 (Y)</button></div>
                    )}
                    
                    {(steelShape.includes('SheetPile')) && (
                    <div className="mt-2 space-y-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold block">施工延長 L (m) <span className="font-normal text-slate-400">(計算用壁幅)</span></label>
                            <input type="number" step="0.1" value={wallLength} onChange={e=>setWallLength(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-right font-bold text-blue-600"/>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-yellow-200/50">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold block">効率 (I用)</label>
                                <input type="number" step="0.05" value={effI} onChange={e=>setEffI(e.target.value)} className="w-full p-1 border rounded text-xs bg-white text-right"/>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold block">効率 (Z用)</label>
                                <input type="number" step="0.05" value={effZ} onChange={e=>setEffZ(e.target.value)} className="w-full p-1 border rounded text-xs bg-white text-right"/>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
                )}
                
                {matType === 'concrete' && (
                <div className="space-y-4">
                    <div><label className="text-xs text-slate-500 font-bold block mb-1">コンクリート</label><select value={rcFcIdx} onChange={e => setRcFcIdx(Number(e.target.value))} className="w-full p-2 border rounded text-sm">{CONCRETE_STRENGTHS.map((fc, idx) => <option key={idx} value={idx}>{fc.label}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-slate-500 font-bold block mb-1">幅 b</label><input type="number" value={rcWidthStr} onChange={e=>setRcWidthStr(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
                    <div><label className="text-xs text-slate-500 font-bold block mb-1">高さ D</label><input type="number" value={rcDepthStr} onChange={e=>setRcDepthStr(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
                    </div>
                </div>
                )}

                {/* ★[MODIFIED] Manual Input UI */}
                {matType === 'manual' && (
                <div className="space-y-3 bg-blue-50 p-4 rounded border border-blue-100">
                      <p className="text-xs text-slate-500 mb-2 font-bold text-center border-b border-blue-200 pb-2">任意断面入力</p>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">断面二次モーメント Ix (cm⁴)</label>
                        <input type="number" step="1" value={manualI} onChange={e=>setManualI(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-right"/>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold block">断面係数 Zx (cm³)</label>
                        <input type="number" step="1" value={manualZ} onChange={e=>setManualZ(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-right"/>
                    </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">ヤング係数 E (kN/mm²)</label>
                        <input type="number" step="1" value={manualE} onChange={e=>setManualE(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-right"/>
                    </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block">断面積 A (cm²) <span className="font-normal text-slate-400">(重量計算用)</span></label>
                        <input type="number" step="0.1" value={manualA} onChange={e=>setManualA(e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-right"/>
                    </div>
                </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded border text-xs space-y-1 font-mono text-slate-600">
                    <div className="flex justify-between"><span>Ix:</span> <span>{(sectionProps.I/10000).toFixed(3)} cm⁴</span></div>
                    <div className="flex justify-between"><span>Zx:</span> <span>{(sectionProps.Z/1000).toFixed(3)} cm³</span></div>
                    <div className="flex justify-between"><span>E :</span> <span>{(sectionProps.E/1000).toFixed(1)} kN/mm²</span></div>
                    <div className="flex justify-between text-slate-500 mt-1 border-t pt-1"><span>A :</span> <span>{sectionProps.A.toFixed(2)} cm²</span></div>
                    <div className="flex justify-between text-slate-500"><span>w :</span> <span>{sectionProps.w.toFixed(1)} kg/m</span></div>
                </div>
                <div className="flex items-center justify-center bg-white border rounded aspect-square p-2"><SectionProfileView props={sectionProps} /></div>
                </div>
            </div>

            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ResultBox label="最大M (+)" val={results.bounds.maxM_pos} x={results.bounds.maxM_pos_x} unit="kN·m" color="text-emerald-600" sub={`σ=${results.bounds.maxSigma_pos.toFixed(0)}`} />
                <ResultBox label="最大M (-)" val={results.bounds.maxM_neg} x={results.bounds.maxM_neg_x} unit="kN·m" color="text-red-600" sub={`σ=${Math.abs(results.bounds.maxSigma_neg).toFixed(0)}`} />
                <ResultBox label="最大たわみ" val={results.bounds.maxDeflection} x={results.bounds.maxDef_x} unit="mm" color="text-blue-600" />
                <ResultBox label="最大せん断" val={results.bounds.maxShear} x={results.bounds.maxShear_x} unit="kN" color="text-amber-600" />
                {results.reactions.map((r, i) => (
                <ResultBox key={i} label={`反力 ${r.label}`} val={r.val} unit="kN" color="text-purple-600" sub={`@${r.x.toFixed(1)}m`} />
                ))}
            </div>
            
            {calcError ? (
                <div className="bg-red-50 border-red-200 border p-4 text-red-700 rounded flex items-center gap-2"><AlertTriangle className="w-5 h-5"/>{calcError}</div>
            ) : (
                <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                    <h2 className="text-sm font-bold text-slate-500 mb-4 flex items-center justify-between">
                    <span>解析結果グラフ ({sectionProps.label})</span>
                    <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded text-slate-500">モデル全長: {totalLength.toFixed(2)}m</span>
                    </h2>
                    <AdvancedVisualizer spans={spans} supports={supports} totalLength={totalLength} loads={loads} results={results} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <PoiTable 
                        finalPoiData={finalPoiData} 
                        userPoi={userPoi} 
                        setUserPoi={setUserPoi} 
                        totalLength={totalLength} 
                        spans={spans} 
                        results={results}
                        sectionProps={sectionProps}
                    />
                </div>
                </>
            )}
            </div>
        </div>
      </div> 

    　　{showResultWindow && (
        <ResultWindow onClose={() => setShowResultWindow(false)}>
            <ResultContent 
                results={results}
                sectionProps={sectionProps}
                loads={loads}
                spans={spans}
                supports={supports}
                totalLength={totalLength}
                finalPoiData={finalPoiData}
                userPoi={userPoi}
                setUserPoi={setUserPoi}
            />
        </ResultWindow>
      )}
      
    </div>
  );
}

// Reactアプリのマウント
const root = createRoot(document.getElementById('root'));
root.render(<App />);
