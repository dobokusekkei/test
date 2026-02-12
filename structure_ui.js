// structure_ui.js
// モーダル、レポート、共通UIコンポーネント
// Note: This file contains JSX and is loaded via custom loader in index.html

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Activity, Settings, List, X, Layers, ChevronDown, ArrowRight, RotateCw, AlertTriangle, Save, FolderOpen, Printer, Edit3, HelpCircle, History, FileDown, Upload, ExternalLink } from 'lucide-react';
import { BEAM_TYPES, getResultAt } from './structure_engine.js';

export function HelpModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><HelpCircle className="w-5 h-5 text-blue-600" />ユーザーマニュアル</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-slate-700 leading-relaxed space-y-6">
                    <p>本アプリケーションは、単純梁や連続梁などの構造計算（断面力・たわみ）をブラウザ上で手軽に行えるツールです。</p>
                </div>
                <div className="p-4 border-t bg-slate-50 text-right"><button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">閉じる</button></div>
            </div>
        </div>
    );
}

export function VersionHistoryModal({ onClose }) {
    const history = [{ ver: "v21.30", date: "2026/02/08", desc: "別ウィンドウで結果を表示可能にした。" }];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><History className="w-5 h-5 text-blue-600" />更新履歴</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-0 overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-500 font-medium"><tr><th className="p-3 border-b">Version</th><th className="p-3 border-b">Date</th><th className="p-3 border-b">Description</th></tr></thead><tbody className="divide-y">{history.map((h, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-3 font-mono font-bold text-blue-600 align-top">{h.ver}</td><td className="p-3 text-slate-500 text-xs align-top whitespace-nowrap">{h.date}</td><td className="p-3 text-slate-700 align-top">{h.desc}</td></tr>))}</tbody></table>
                </div>
                <div className="p-4 border-t bg-slate-50 text-right"><button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">閉じる</button></div>
            </div>
        </div>
    );
}

export function PoiInput({ id, globalX, rangeStart, onUpdate }) {
    const localVal = Math.max(0, globalX - rangeStart);
    const [val, setVal] = useState(localVal.toFixed(3));
    useEffect(() => { if (Math.abs(Number(val) - localVal) > 0.001) { setVal(localVal.toFixed(3)); } }, [globalX, rangeStart]);
    const handleChange = (e) => { const v = e.target.value; setVal(v); const n = parseFloat(v); if (!isNaN(n)) { onUpdate(id, n + rangeStart); } };
    return (<input type="number" step="0.001" className="w-16 p-1 border rounded bg-white font-mono text-blue-700 focus:ring-1 ring-blue-400" value={val} onChange={handleChange} />);
}

export function ResultBox({ label, val, x, unit, sub, color }) {
  return (
    <div className="bg-white p-3 rounded-lg border shadow-sm">
      <div className="text-[10px] text-slate-400 uppercase font-bold">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{val?.toFixed(2)} <span className="text-xs text-slate-400">{unit}</span></div>
      <div className="flex gap-2 text-[10px]">
        {x !== undefined && <span className="bg-slate-100 px-1 rounded inline-block text-slate-500">x={x.toFixed(3)}m</span>}
        {sub && <span className="bg-slate-100 px-1 rounded inline-block text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

export function PoiTable({ finalPoiData, userPoi, setUserPoi, totalLength, spans, results, sectionProps }) {
  const addUserPoint = (globalX) => { const newId = Date.now(); setUserPoi([...userPoi, { id: newId, x: globalX }]); };
  const updateUserPoint = (id, newGlobalX) => { setUserPoi(userPoi.map(p => p.id === id ? { ...p, x: newGlobalX } : p)); };
  const removeUserPoint = (id) => { setUserPoi(userPoi.filter(p => p.id !== id)); };
  const spanRanges = useMemo(() => { let currentX = 0; return spans.map(len => { const range = { start: currentX, end: currentX + len }; currentX += len; return range; }); }, [spans]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold text-slate-600">着目点詳細 (スパン別)</h3></div>
      {spanRanges.map((range, sIdx) => {
        const spanPoints = finalPoiData.filter(p => p.x >= range.start - 1e-4 && p.x <= range.end + 1e-4);
        return (
          <div key={sIdx} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 flex justify-between items-center">
                <span>径間 {sIdx + 1} ({String.fromCharCode(65+sIdx)} - {String.fromCharCode(65+sIdx+1)})</span>
                <div className="flex items-center gap-3"><span className="font-normal opacity-70">スパン長: {spans[sIdx].toFixed(2)}m</span><button onClick={() => addUserPoint(range.start)} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"><Plus className="w-3 h-3"/> 追加</button></div>
            </div>
            <table className="w-full text-[11px] text-left"><thead className="bg-slate-50 text-slate-400 border-b"><tr><th className="p-2 w-24">Local x (m)</th><th className="p-2">Q (kN)</th><th className="p-2">M (kN·m)</th><th className="p-2">σ (N/mm²)</th><th className="p-2">δ (mm)</th><th className="w-8"></th></tr></thead>
              <tbody className="divide-y">{spanPoints.map((p, idx) => {
                  const localX = Math.max(0, Math.min(spans[sIdx], p.x - range.start)); const isUser = p.type === 'user'; const val = getResultAt(p.x, results, sectionProps, sIdx);
                  return (<tr key={p.id} className={isUser ? "bg-blue-50/20" : "hover:bg-slate-50"}><td className="p-2"><div className="flex items-center gap-1">{isUser ? (<PoiInput id={p.id} globalX={p.x} rangeStart={range.start} onUpdate={updateUserPoint} />) : (<div className="flex items-center gap-2"><span className="font-mono text-slate-500 w-12">{localX.toFixed(3)}</span><span className="text-[9px] px-1 bg-slate-200 rounded text-slate-500">Auto</span></div>)}{isUser && <span className="text-[9px] text-slate-300">m</span>}</div></td><td className="p-2 font-mono text-slate-600">{val?.Q?.toFixed(2)}</td><td className="p-2 font-mono text-slate-600">{val?.M?.toFixed(2)}</td><td className="p-2 font-mono text-slate-700">{val?.sigma?.toFixed(1)}</td><td className="p-2 font-mono text-blue-600 font-bold">{val?.deflection?.toFixed(2)}</td><td className="p-2 text-right">{isUser && (<button onClick={() => removeUserPoint(p.id)}><X className="w-3 h-3 text-slate-300 hover:text-red-500" /></button>)}</td></tr>);
                })}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ★[MODIFIED] 受け取ったVisualizerComponentを使用して描画する
export function PrintReport({ params }) {
    const { sectionProps, results, loads, spans, totalLength, beamType, finalPoiData, Visualizer } = params;
    const today = new Date().toLocaleDateString('ja-JP');
    const spanRanges = spans.map((len, idx) => { const start = spans.slice(0, idx).reduce((a, b) => a + b, 0); return { idx, len, start, end: start + len }; });

    return (
        <div className="space-y-6 text-sm text-slate-800">
            <header className="border-b-2 border-slate-800 pb-2 mb-4 flex justify-between items-end">
                <div><h1 className="text-xl font-bold text-slate-900">構造計算書</h1><p className="text-xs text-slate-500">Structural Analysis Report</p></div>
                <div className="text-right"><p className="font-bold text-sm">作成日: {today}</p><p className="text-xs text-slate-500">Ver 21.30</p></div>
            </header>
            <div className="grid grid-cols-2 gap-6 mb-4 avoid-break">
                <section><h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">1. 設計条件</h2><table className="w-full text-left text-xs border-collapse"><tbody><tr className="border-b"><th className="py-1 text-slate-500 w-24">梁タイプ</th><td className="font-bold">{BEAM_TYPES[beamType]?.label}</td></tr><tr className="border-b"><th className="py-1 text-slate-500">スパン構成</th><td className="font-mono">{spans.map(s=>s.toFixed(2)+'m').join(' + ')} (L={totalLength.toFixed(2)}m)</td></tr><tr className="border-b"><th className="py-1 text-slate-500">使用材料</th><td className="font-bold">{sectionProps.label}</td></tr><tr className="border-b"><th className="py-1 text-slate-500">断面性能</th><td className="font-mono">I={(sectionProps.I/10000).toFixed(3)}cm⁴, Z={(sectionProps.Z/1000).toFixed(3)}cm³, E={(sectionProps.E/1000).toFixed(1)}kN/mm²</td></tr></tbody></table></section>
                <section><h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">2. 荷重条件</h2><table className="w-full text-xs text-left border border-slate-200"><thead className="bg-slate-100"><tr><th className="p-1 border">No.</th><th className="p-1 border">種類</th><th className="p-1 border">大きさ</th><th className="p-1 border">位置</th></tr></thead><tbody>{loads.map((l, i) => (<tr key={l.id} className="border-b"><td className="p-1 border text-center">{i+1}</td><td className="p-1 border">{l.type === 'point' ? '集中' : l.type === 'moment' ? 'モーメント' : '分布'}</td><td className="p-1 border font-mono">{l.type==='trapezoid'?`${l.mag}~${l.magEnd}`:l.mag}</td><td className="p-1 border font-mono">{l.type==='point'||l.type==='moment'?l.pos:`${l.pos}~${l.pos+l.length}`}</td></tr>))}{loads.length===0 && <tr><td colSpan="4" className="p-2 text-center text-slate-400">なし</td></tr>}</tbody></table></section>
            </div>
            <section className="mb-4">
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">3. 解析結果一覧</h2>
                <div className="grid grid-cols-1 gap-4">
                    {results.spanBounds.map((sb, idx) => {
                        const offset = spans.slice(0, idx).reduce((a, b) => a + b, 0);
                        return (
                            <div key={idx} className="avoid-break border rounded-lg overflow-hidden mb-2">
                                <div className="text-xs font-bold bg-slate-100 px-2 py-1 border-b text-slate-700">径間 {idx + 1} <span className="font-normal ml-2 text-slate-500">L = {spans[idx].toFixed(2)}m</span></div>
                                <table className="w-full text-xs text-right"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1 border-b w-32 text-left pl-2">項目</th><th className="p-1 border-b">値</th><th className="p-1 border-b">位置 x (local)</th><th className="p-1 border-b">応力度 σ (N/mm²)</th></tr></thead><tbody><tr className="border-b"><td className="p-1 text-left pl-2">最大曲げ M<sub>max</sub> (+)</td><td className="p-1 font-mono font-bold">{sb.maxM.toFixed(2)} kN·m</td><td className="p-1 font-mono">{(sb.maxM_x - offset).toFixed(3)} m</td><td className="p-1 font-mono">{(Math.abs(sb.maxM) * 1e6 / sectionProps.Z).toFixed(0)}</td></tr><tr className="border-b"><td className="p-1 text-left pl-2">最大曲げ M<sub>min</sub> (-)</td><td className="p-1 font-mono font-bold">{sb.minM.toFixed(2)} kN·m</td><td className="p-1 font-mono">{(sb.minM_x - offset).toFixed(3)} m</td><td className="p-1 font-mono">{(Math.abs(sb.minM) * 1e6 / sectionProps.Z).toFixed(0)}</td></tr><tr className="border-b"><td className="p-1 text-left pl-2">最大せん断 Q<sub>max</sub> (+)</td><td className="p-1 font-mono font-bold">{sb.maxQ.toFixed(2)} kN</td><td className="p-1 font-mono">{(sb.maxQ_x - offset).toFixed(3)} m</td><td className="p-1 text-slate-400">-</td></tr><tr className="border-b"><td className="p-1 text-left pl-2">最大せん断 Q<sub>min</sub> (-)</td><td className="p-1 font-mono font-bold">{sb.minQ.toFixed(2)} kN</td><td className="p-1 font-mono">{(sb.minQ_x - offset).toFixed(3)} m</td><td className="p-1 text-slate-400">-</td></tr><tr className="border-b"><td className="p-1 text-left pl-2">最大変位 δ<sub>max</sub> (+)</td><td className="p-1 font-mono font-bold">{sb.maxD.toFixed(2)} mm</td><td className="p-1 font-mono">{(sb.maxD_x - offset).toFixed(3)} m</td><td className="p-1 text-slate-400">-</td></tr><tr><td className="p-1 text-left pl-2">最大変位 δ<sub>min</sub> (-)</td><td className="p-1 font-mono font-bold">{sb.minD.toFixed(2)} mm</td><td className="p-1 font-mono">{(sb.minD_x - offset).toFixed(3)} m</td><td className="p-1 text-slate-400">-</td></tr></tbody></table>
                            </div>
                        );
                    })}
                    <div className="avoid-break mt-2 border rounded p-2 bg-slate-50"><div className="text-xs font-bold text-slate-600 mb-1">支点反力一覧</div><div className="flex flex-wrap gap-4">{results.reactions.map((r, i) => (<div key={i} className="text-xs font-mono">R<sub>{r.label}</sub> = <strong>{r.val.toFixed(2)}</strong> kN <span className="text-slate-400">(@{r.x.toFixed(1)}m)</span></div>))}</div></div>
                </div>
            </section>
            <section className="mb-4 avoid-break">
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">4. 応力図 (SFD, BMD, Deflection)</h2>
                <div className="border rounded p-2 flex justify-center bg-white">
                    {/* ★[MODIFIED] Inject Visualizer Component */}
                    {Visualizer && <Visualizer {...params} forceWidth={580} />}
                </div>
            </section>
            <section className="page-break"　>
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">5. 計算結果詳細（スパン別）</h2>
                <div className="grid grid-cols-1 gap-4">{spanRanges.map((range, sIdx) => { const spanPoints = finalPoiData.filter(p => p.x >= range.start - 1e-4 && p.x <= range.end + 1e-4); if (spanPoints.length === 0) return null; return (<div key={sIdx} className="avoid-break mb-2"><div className="text-xs font-bold bg-slate-100 px-2 py-1 border-t border-l border-r rounded-t text-slate-700">径間 {sIdx + 1} ({String.fromCharCode(65+sIdx)} - {String.fromCharCode(65+sIdx+1)}) <span className="font-normal ml-2 text-slate-500">L = {range.len.toFixed(2)}m</span></div><table className="w-full text-xs text-right border border-slate-200"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-1 border w-16 text-center">x (local)</th><th className="p-1 border">せん断 Q (kN)</th><th className="p-1 border">曲げ M (kN·m)</th><th className="p-1 border">応力 σ (N/mm²)</th><th className="p-1 border">たわみ δ (mm)</th></tr></thead><tbody>{spanPoints.map((p, idx) => { const localX = Math.max(0, Math.min(range.len, p.x - range.start)); const val = getResultAt(p.x, results, sectionProps, sIdx); return (<tr key={idx} className="border-b"><td className="p-1 border text-center font-mono bg-slate-50/50">{localX.toFixed(3)}</td><td className="p-1 border font-mono">{val?.Q?.toFixed(2)}</td><td className="p-1 border font-mono">{val?.M?.toFixed(2)}</td><td className="p-1 border font-mono">{val?.sigma?.toFixed(1)}</td><td className="p-1 border font-mono">{val?.deflection?.toFixed(2)}</td></tr>); })}</tbody></table></div>); })}</div>
            </section>
        </div>
    );
}

export function ResultWindow({ onClose, children }) {
    const [container, setContainer] = useState(null);
    const newWindow = useRef(null);
    useEffect(() => {
        newWindow.current = window.open("", "_blank", "width=1000,height=800,left=200,top=100");
        const win = newWindow.current;
        if (!win) { alert("ポップアップがブロックされました。許可してください。"); onClose(); return; }
        Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"], script')).forEach(node => { win.document.head.appendChild(node.cloneNode(true)); });
        win.document.title = "構造計算結果 (リアルタイム表示)";
        win.document.body.className = "bg-slate-50 text-slate-800 p-4 overflow-y-auto";
        const div = win.document.createElement("div"); div.id = "portal-root"; win.document.body.appendChild(div);
        setContainer(div);
        win.onbeforeunload = () => { onClose(); };
        return () => { if (win && !win.closed) { win.close(); } };
    }, []);
    return container ? createPortal(children, container) : null;
}

// ★[MODIFIED] VisualizerComponentをPropとして受け取る
export function ResultContent({ results, sectionProps, loads, spans, supports, totalLength, finalPoiData, userPoi, setUserPoi, Visualizer }) {
    return (
        <div className="space-y-6 container mx-auto max-w-5xl">
            <header className="border-b pb-4 mb-4"><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Activity className="w-6 h-6 text-blue-600" />計算結果モニター</h1><p className="text-sm text-slate-500">メイン画面の入力変更がリアルタイムに反映されます</p></header>
            <section>
                <h3 className="text-sm font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">最大値・反力一覧</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResultBox label="最大M (+)" val={results.bounds.maxM_pos} x={results.bounds.maxM_pos_x} unit="kN·m" color="text-emerald-600" sub={`σ=${results.bounds.maxSigma_pos.toFixed(0)}`} />
                    <ResultBox label="最大M (-)" val={results.bounds.maxM_neg} x={results.bounds.maxM_neg_x} unit="kN·m" color="text-red-600" sub={`σ=${Math.abs(results.bounds.maxSigma_neg).toFixed(0)}`} />
                    <ResultBox label="最大たわみ" val={results.bounds.maxDeflection} x={results.bounds.maxDef_x} unit="mm" color="text-blue-600" />
                    <ResultBox label="最大せん断" val={results.bounds.maxShear} x={results.bounds.maxShear_x} unit="kN" color="text-amber-600" />
                    {results.reactions.map((r, i) => (<ResultBox key={i} label={`反力 ${r.label}`} val={r.val} unit="kN" color="text-purple-600" sub={`@${r.x.toFixed(1)}m`} />))}
                </div>
            </section>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center justify-between"><span>応力図・変位図</span><span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded text-slate-500">Auto Scale</span></h3>
                {/* ★[MODIFIED] Inject Visualizer Component */}
                {Visualizer && <Visualizer spans={spans} supports={supports} totalLength={totalLength} loads={loads} results={results} />}
            </section>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <PoiTable finalPoiData={finalPoiData} userPoi={userPoi} setUserPoi={setUserPoi} totalLength={totalLength} spans={spans} results={results} sectionProps={sectionProps} />
            </section>
        </div>
    );
}
