import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Activity, Settings, List, X, Layers, ChevronDown, ArrowRight, RotateCw, AlertTriangle, Save, FolderOpen, Printer, Edit3, HelpCircle, History, FileDown, Upload, ExternalLink } from 'lucide-react';
import { COLORS, BEAM_TYPES } from './constants.js';
import { getResultAt } from './logic.js';

// ==========================================
// [NEW COMPONENT] Help Modal / User Manual
// ==========================================
export function HelpModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                        ユーザーマニュアル
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-slate-700 leading-relaxed space-y-6">
                    <section>
                        <h3 className="font-bold text-slate-900 border-l-4 border-blue-500 pl-2 mb-2">1. はじめに</h3>
                        <p>本アプリケーションは、単純梁や連続梁などの構造計算（断面力・たわみ）をブラウザ上で手軽に行えるツールです。鋼材やRC断面のデータベースを内蔵し、即座に計算結果をグラフで可視化します。</p>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 border-l-4 border-blue-500 pl-2 mb-2">2. 基本操作</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>断面設定:</strong> 左側のパネルで「S造」「RC造」「任意」から選択し、形状や寸法を指定します。</li>
                            <div className="mt-2 p-3 bg-slate-50 border rounded text-xs text-slate-600">
                                <strong>RC断面の算出式（矩形）:</strong><br/>
                                幅 <span className="math-inline">b</span>, 高さ <span className="math-inline">D</span> の場合
                                <div className="math-display text-base py-2">
                                    <span className="math-inline">I</span> <span className="op">=</span>
                                    <div className="fraction">
                                        <span><span className="math-inline">b</span><span className="math-inline">D</span><span className="sup">3</span></span>
                                        <span>12</span>
                                    </div>
                                    <span className="op">,</span>
                                    &nbsp;&nbsp;
                                    <span className="math-inline">Z</span> <span className="op">=</span>
                                    <div className="fraction">
                                        <span><span className="math-inline">b</span><span className="math-inline">D</span><span className="sup">2</span></span>
                                        <span>6</span>
                                    </div>
                                </div>
                            </div>
                            <li><strong>モデル設定:</strong> 梁タイプ（単純梁、連続梁など）を選択し、スパン長を入力します。複数スパンはカンマ区切り（例: <code>5.0, 5.0</code>）で入力可能です。</li>
                            <li><strong>荷重入力:</strong> 「集中」「等分布」「台形」「モーメント」から種類を選び、大きさ・位置を入力して「追加」ボタンを押します。</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 border-l-4 border-blue-500 pl-2 mb-2">3. 荷重の種類について</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded border">
                                <span className="font-bold block text-blue-700 mb-1">集中荷重 (Point)</span>
                                1点に作用する荷重です。下向きが正(+)です。
                            </div>
                            <div className="bg-slate-50 p-3 rounded border">
                                <span className="font-bold block text-blue-700 mb-1">分布荷重 (Distributed)</span>
                                一定区間に等分布で作用します。
                            </div>
                            <div className="bg-slate-50 p-3 rounded border">
                                <span className="font-bold block text-blue-700 mb-1">台形荷重 (Trapezoid)</span>
                                始点と終点で大きさが異なる分布荷重です。三角形状も可能です。
                            </div>
                            <div className="bg-slate-50 p-3 rounded border">
                                <span className="font-bold block text-blue-700 mb-1">モーメント荷重 (Moment)</span>
                                特定の点に回転モーメントを与えます。時計回りが正(+)です。
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 border-l-4 border-blue-500 pl-2 mb-2">4. 機能・Tips</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>印刷機能:</strong> 右上の「印刷」ボタンから、計算書形式のレイアウトで印刷・PDF保存が可能です。</li>
                            <li><strong>データ保存(CSV出力):</strong> 計算結果および入力データをCSVファイルとして出力・保存できます。</li>
                            <li><strong>読込:</strong> 出力されたCSVファイルを読み込んで、計算条件を復元できます。</li>
                            <li><strong>着目点:</strong> グラフ下の表では、最大値発生位置などが自動計算されます。「追加」ボタンで任意の位置の結果を確認することも可能です。</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 border-l-4 border-blue-500 pl-2 mb-2">5. 計算ロジック詳細（技術資料）</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">5.1 解析手法</h4>
                                <p>本アプリケーションでは、変位法（たわみ角法）に基づくマトリクス解析を行っています。各スパンを要素とし、節点（支点）における回転角とモーメントの釣り合い条件から連立方程式を構築し、節点モーメントを算出しています。</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">5.2 支配方程式（3連モーメントの定理の一般化）</h4>
                                <p>連続梁の任意の中間支点 <span className="math-inline">n</span> における釣り合い条件は、以下の式で表されます。</p>
                                <div className="math-display">
                                    <span className="math-inline">M</span><span className="sub">n</span><span className="math-inline">L</span><span className="sub">n</span>
                                    <span className="op">+</span>
                                    2<span className="math-inline">M</span><span className="sub">n+1</span>
                                    (<span className="math-inline">L</span><span className="sub">n</span> <span className="op">+</span> <span className="math-inline">L</span><span className="sub">n+1</span>)
                                    <span className="op">+</span>
                                    <span className="math-inline">M</span><span className="sub">n+2</span><span className="math-inline">L</span><span className="sub">n+1</span>
                                    <span className="op">=</span>
                                    <span className="op">-</span>6
                                    (<span className="math-inline">&Phi;</span><span className="sub">R,n</span> <span className="op">+</span> <span className="math-inline">&Phi;</span><span className="sub">L,n+1</span>)
                                </div>
                                <p className="text-xs text-slate-500 mt-1">ここで、<span className="math-inline">M</span> は節点モーメント、<span className="math-inline">L</span> はスパン長、<span className="math-inline">&Phi;</span> は単純梁として計算した際の支点におけるたわみ角（荷重項）を表します。</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">5.3 断面力および変位の算定</h4>
                                <p>算出された節点モーメント <span className="math-inline">M</span><span className="sub">L</span>, <span className="math-inline">M</span><span className="sub">R</span> を境界条件とし、各スパンごとの単純梁としての断面力（<span className="math-inline">Q</span><span className="sub">0</span>, <span className="math-inline">M</span><span className="sub">0</span>）に重ね合わせることで、任意位置 <span className="math-inline">x</span> における最終的な値を求めています。</p>
                                
                                <div className="math-display">
                                    <div className="mb-4">
                                        <span className="func">M</span>(<span className="math-inline">x</span>) <span className="op">=</span> <span className="math-inline">M</span><span className="sub">0</span>(<span className="math-inline">x</span>) <span className="op">+</span> <span className="math-inline">M</span><span className="sub">L</span> <span className="op">+</span> 
                                        <div className="fraction">
                                            <span><span className="math-inline">x</span></span>
                                            <span><span className="math-inline">L</span></span>
                                        </div>
                                        (<span className="math-inline">M</span><span className="sub">R</span> <span className="op">-</span> <span className="math-inline">M</span><span className="sub">L</span>)
                                    </div>
                                    <div>
                                        <span className="func">Q</span>(<span className="math-inline">x</span>) <span className="op">=</span> <span className="math-inline">Q</span><span className="sub">0</span>(<span className="math-inline">x</span>) <span className="op">+</span> 
                                        <div className="fraction">
                                            <span><span className="math-inline">M</span><span className="sub">R</span> <span className="op">-</span> <span className="math-inline">M</span><span className="sub">L</span></span>
                                            <span><span className="math-inline">L</span></span>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 mb-2"><span className="font-bold text-slate-700">支点反力 (Reactions):</span><br/>支点位置 <span className="math-inline">i</span> における反力 <span className="math-inline">R</span><span className="sub">i</span> は、その支点を挟む左右のせん断力の差として算出されます。</p>
                                <div className="math-display">
                                    <span className="math-inline">R</span><span className="sub">i</span> <span className="op">=</span> <span className="func">Q</span>(<span className="math-inline">x</span><span className="sub">i</span><span className="op">+</span>0) <span className="op">-</span> <span className="func">Q</span>(<span className="math-inline">x</span><span className="sub">i</span><span className="op">-</span>0)
                                </div>

                                <p className="mt-4 mb-2"><span className="font-bold text-slate-700">たわみ (Deflection):</span><br/>たわみ曲線微分方程式を二重積分することで算出しています。</p>
                                <div className="math-display">
                                    <div className="mb-4">
                                        <div className="fraction">
                                            <span><span className="math-inline">d</span><span className="sup">2</span><span className="math-inline">v</span></span>
                                            <span><span className="math-inline">dx</span><span className="sup">2</span></span>
                                        </div>
                                        <span className="op">=</span> <span className="op">-</span>
                                        <div className="fraction">
                                            <span><span className="func">M</span>(<span className="math-inline">x</span>)</span>
                                            <span><span className="math-inline">E</span><span className="math-inline">I</span></span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="func">v</span>(<span className="math-inline">x</span>) <span className="op">=</span> 
                                        <span className="integral">&int;&int;</span>
                                        <span className="op">-</span>
                                        <div className="fraction">
                                            <span><span className="func">M</span>(<span className="math-inline">x</span>)</span>
                                            <span><span className="math-inline">E</span><span className="math-inline">I</span></span>
                                        </div>
                                        <span className="math-inline">dx</span><span className="sup">2</span>
                                        <span className="op">+</span> <span className="math-inline">C</span><span className="sub">1</span><span className="math-inline">x</span> <span className="op">+</span> <span className="math-inline">C</span><span className="sub">2</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="p-4 border-t bg-slate-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">閉じる</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// [NEW COMPONENT] Version History Modal
// ==========================================
export function VersionHistoryModal({ onClose }) {
    const history = [
        { ver: "v21.30", date: "2026/02/08", desc: "別ウィンドウで結果を表示可能にした。" },
        { ver: "v21.29", date: "2026/02/08", desc: "CSV出力を印刷レポート準拠の詳細形式に改修（スパンごとの最大最小、ローカル座標での詳細結果）。CSV読込時のインプットデータ復元処理を強化。" },
        { ver: "v21.28", date: "2026/02/08", desc: "CSV出力機能を強化。結果詳細（全着目点）を出力し、材料入力データは選択中のタイプのみ出力するように変更。" },
        { ver: "v21.27", date: "2026/02/08", desc: "入力データ保存機能を廃止し、結果CSV出力機能（入力データ含む）を実装。CSV読込による入力データ復元機能を追加。" },
        { ver: "v21.26", date: "2026/02/08", desc: "荷重表等の支点表示において、各スパンごとの値を厳密に分離して表示するように修正。" },
        { ver: "v21.25", date: "2026/02/08", desc: "ラベル配置ロジックからX方向移動（左右振り分け）を廃止。" },
        { ver: "v21.24", date: "2026/02/08", desc: "ラベル配置ロジックの定数を最終調整。左右振り分け処理を追加。" },
        { ver: "v21.23", date: "2026/02/08", desc: "ラベル配置をグラフ線へ接近(10-12px)させ、衝突判定を厳密化(14px)。" },
        { ver: "v21.22", date: "2026/02/08", desc: "ラベル重なり回避ロジックを刷新（方向自動判定＋厳密重複回避）。" },
        { ver: "v21.21", date: "2026/02/08", desc: "ラベル重なり回避ロジックを「X座標順次確定（貪欲法）」に刷新。" },
        { ver: "v21.20", date: "2026/02/08", desc: "ラベル重なり回避ロジックを「事前計算方式」に刷新。" },
        { ver: "v21.19", date: "2026/02/08", desc: "グラフ描画レイアウト調整（全体シフト）、ラベル重なり回避ロジックの強化。" },
        { ver: "v21.18", date: "2026/02/08", desc: "固定端(Fixed)に作用する集中モーメント荷重を計算対象から除外(スキップ)する処理を追加。" },
        { ver: "v21.17", date: "2026/02/05", desc: "右端単純支持における集中モーメント荷重の計算結果表示を補正。バージョン履歴機能を追加。" },
        { ver: "v21.16", date: "2026/02/04", desc: "着目点入力の改善(PoiInput)、グラフ描画の重複回避(レイアウト拡大)、不連続点処理の強化。" },
        { ver: "v21.15", date: "2026/01/29", desc: "任意断面入力モードの実装、モーメント荷重への対応、断面プロファイル表示の拡充。" },
        { ver: "v21.00", date: "2025/12/01", desc: "UIデザインの刷新、印刷レポート機能の強化、保存/読込機能の実装。" }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <History className="w-5 h-5 text-blue-600" />
                        更新履歴
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-0 overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="p-3 border-b">Version</th>
                                <th className="p-3 border-b">Date</th>
                                <th className="p-3 border-b">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {history.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono font-bold text-blue-600 align-top">{h.ver}</td>
                                    <td className="p-3 text-slate-500 text-xs align-top whitespace-nowrap">{h.date}</td>
                                    <td className="p-3 text-slate-700 align-top">{h.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t bg-slate-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">閉じる</button>
                </div>
            </div>
        </div>
    );
}

// ★[NEW] PoiInput Component
// 入力中の状態をローカルで持ち、確定(Blur/Enter)時または数値として有効な場合に親を更新する
export function PoiInput({ id, globalX, rangeStart, onUpdate }) {
    const localVal = Math.max(0, globalX - rangeStart);
    const [val, setVal] = useState(localVal.toFixed(3));

    // 外部（親）からの変更を反映
    useEffect(() => {
        // 現在の入力値と乖離がある場合のみ更新（編集中に書き換わるのを防ぐ）
        // ただしフォーカスが外れているときのみ同期するのが理想だが、
        // 簡易的に数値としての差分チェックで行う
        if (Math.abs(Number(val) - localVal) > 0.001) {
             setVal(localVal.toFixed(3));
        }
    }, [globalX, rangeStart]);

    const handleChange = (e) => {
        const v = e.target.value;
        setVal(v);
        
        // 即時反映（数値として有効な場合）
        const n = parseFloat(v);
        if (!isNaN(n)) {
            onUpdate(id, n + rangeStart);
        }
    };

    return (
        <input 
            type="number" 
            step="0.001" 
            className="w-16 p-1 border rounded bg-white font-mono text-blue-700 focus:ring-1 ring-blue-400"
            value={val} 
            onChange={handleChange} 
        />
    );
}

// ==========================================
// [NEW] 別ウィンドウ管理用コンポーネント (Portal)
// ==========================================
export function ResultWindow({ onClose, children }) {
    const [container, setContainer] = useState(null);
    const newWindow = useRef(null);

    useEffect(() => {
        // 新しいウィンドウを開く
        newWindow.current = window.open("", "_blank", "width=1000,height=800,left=200,top=100");
        const win = newWindow.current;

        if (!win) {
            alert("ポップアップがブロックされました。許可してください。");
            onClose();
            return;
        }

        // メイン画面のスタイル（CSS/Tailwind）をコピーして適用
        Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"], script')).forEach(node => {
            win.document.head.appendChild(node.cloneNode(true));
        });
        win.document.title = "構造計算結果 (リアルタイム表示)";
        
        // Tailwindの適用を確実にするためbodyにクラスを追加
        win.document.body.className = "bg-slate-50 text-slate-800 p-4 overflow-y-auto";

        // レンダリング用のdivを作成
        const div = win.document.createElement("div");
        div.id = "portal-root";
        win.document.body.appendChild(div);
        setContainer(div);

        // ウィンドウが閉じられた時の処理
        win.onbeforeunload = () => {
            onClose();
        };

        // クリーンアップ
        return () => {
            if (win && !win.closed) {
                win.close();
            }
        };
    }, []);

    // コンテナができたら、そこにchildren(中身)を描画
    return container ? createPortal(children, container) : null;
}

// ==========================================
// [NEW] 別ウィンドウの中身
// ==========================================
export function ResultContent({ results, sectionProps, loads, spans, supports, totalLength, finalPoiData, userPoi, setUserPoi }) {
    return (
        <div className="space-y-6 container mx-auto max-w-5xl">
            <header className="border-b pb-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-600" />
                    計算結果モニター
                </h1>
                <p className="text-sm text-slate-500">メイン画面の入力変更がリアルタイムに反映されます</p>
            </header>

            {/* 結果数値ボックス */}
            <section>
                <h3 className="text-sm font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">最大値・反力一覧</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResultBox label="最大M (+)" val={results.bounds.maxM_pos} x={results.bounds.maxM_pos_x} unit="kN·m" color="text-emerald-600" sub={`σ=${results.bounds.maxSigma_pos.toFixed(0)}`} />
                    <ResultBox label="最大M (-)" val={results.bounds.maxM_neg} x={results.bounds.maxM_neg_x} unit="kN·m" color="text-red-600" sub={`σ=${Math.abs(results.bounds.maxSigma_neg).toFixed(0)}`} />
                    <ResultBox label="最大たわみ" val={results.bounds.maxDeflection} x={results.bounds.maxDef_x} unit="mm" color="text-blue-600" />
                    <ResultBox label="最大せん断" val={results.bounds.maxShear} x={results.bounds.maxShear_x} unit="kN" color="text-amber-600" />
                    {results.reactions.map((r, i) => (
                        <ResultBox key={i} label={`反力 ${r.label}`} val={r.val} unit="kN" color="text-purple-600" sub={`@${r.x.toFixed(1)}m`} />
                    ))}
                </div>
            </section>

            {/* グラフ描画 */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center justify-between">
                    <span>応力図・変位図</span>
                    <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded text-slate-500">Auto Scale</span>
                </h3>
                <AdvancedVisualizer spans={spans} supports={supports} totalLength={totalLength} loads={loads} results={results} />
            </section>

            {/* 着目点テーブル */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <PoiTable 
                    finalPoiData={finalPoiData} 
                    userPoi={userPoi} 
                    setUserPoi={setUserPoi} 
                    totalLength={totalLength} 
                    spans={spans} 
                    results={results}
                    sectionProps={sectionProps}
                />
            </section>
        </div>
    );
}

// ==========================================
// [PRINT COMPONENT] 印刷用レイアウト
// ==========================================
export function PrintReport({ params }) {
    const { sectionProps, results, loads, spans, totalLength, beamType, finalPoiData } = params;
    const today = new Date().toLocaleDateString('ja-JP');

    const spanRanges = spans.map((len, idx) => {
        const start = spans.slice(0, idx).reduce((a, b) => a + b, 0);
        return { idx, len, start, end: start + len };
    });

    return (
        <div className="space-y-6 text-sm text-slate-800">
            <header className="border-b-2 border-slate-800 pb-2 mb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">構造計算書</h1>
                    <p className="text-xs text-slate-500">Structural Analysis Report</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-sm">作成日: {today}</p>
                    <p className="text-xs text-slate-500">Ver 21.29</p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-6 mb-4 avoid-break">
                <section>
                    <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">1. 設計条件</h2>
                    <table className="w-full text-left text-xs border-collapse">
                        <tbody>
                            <tr className="border-b"><th className="py-1 text-slate-500 w-24">梁タイプ</th><td className="font-bold">{BEAM_TYPES[beamType]?.label}</td></tr>
                            <tr className="border-b"><th className="py-1 text-slate-500">スパン構成</th><td className="font-mono">{spans.map(s=>s.toFixed(2)+'m').join(' + ')} (L={totalLength.toFixed(2)}m)</td></tr>
                            <tr className="border-b"><th className="py-1 text-slate-500">使用材料</th><td className="font-bold">{sectionProps.label}</td></tr>
                            <tr className="border-b"><th className="py-1 text-slate-500">断面性能</th><td className="font-mono">
                                I={(sectionProps.I/10000).toFixed(3)}cm⁴, Z={(sectionProps.Z/1000).toFixed(3)}cm³, E={(sectionProps.E/1000).toFixed(1)}kN/mm²
                            </td></tr>
                        </tbody>
                    </table>
                </section>
                
                <section>
                    <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">2. 荷重条件</h2>
                    <table className="w-full text-xs text-left border border-slate-200">
                        <thead className="bg-slate-100">
                            <tr><th className="p-1 border">No.</th><th className="p-1 border">種類</th><th className="p-1 border">大きさ</th><th className="p-1 border">位置</th></tr>
                        </thead>
                        <tbody>
                            {loads.map((l, i) => (
                                <tr key={l.id} className="border-b">
                                    <td className="p-1 border text-center">{i+1}</td>
                                    <td className="p-1 border">{l.type === 'point' ? '集中' : l.type === 'moment' ? 'モーメント' : '分布'}</td>
                                    <td className="p-1 border font-mono">{l.type==='trapezoid'?`${l.mag}~${l.magEnd}`:l.mag}</td>
                                    <td className="p-1 border font-mono">{l.type==='point'||l.type==='moment'?l.pos:`${l.pos}~${l.pos+l.length}`}</td>
                                </tr>
                            ))}
                            {loads.length===0 && <tr><td colSpan="4" className="p-2 text-center text-slate-400">なし</td></tr>}
                        </tbody>
                    </table>
                </section>
            </div>

            <section className="mb-4">
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">3. 解析結果一覧（スパン別最大・最小）</h2>
                <div className="grid grid-cols-1 gap-4">
                    {results.spanBounds.map((sb, idx) => {
                        const offset = spans.slice(0, idx).reduce((a, b) => a + b, 0);
                        return (
                            <div key={idx} className="avoid-break border rounded-lg overflow-hidden mb-2">
                                <div className="text-xs font-bold bg-slate-100 px-2 py-1 border-b text-slate-700">
                                    径間 {idx + 1} <span className="font-normal ml-2 text-slate-500">L = {spans[idx].toFixed(2)}m</span>
                                </div>
                                <table className="w-full text-xs text-right">
                                    <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="p-1 border-b w-32 text-left pl-2">項目</th>
                                                <th className="p-1 border-b">値</th>
                                                <th className="p-1 border-b">位置 x (local)</th>
                                                <th className="p-1 border-b">応力度 σ (N/mm²)</th>
                                            </tr>
                                    </thead>
                                    <tbody>
                                            <tr className="border-b">
                                                <td className="p-1 text-left pl-2">最大曲げ M<sub>max</sub> (+)</td>
                                                <td className="p-1 font-mono font-bold">{sb.maxM.toFixed(2)} kN·m</td>
                                                <td className="p-1 font-mono">{(sb.maxM_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 font-mono">{(Math.abs(sb.maxM) * 1e6 / sectionProps.Z).toFixed(0)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-1 text-left pl-2">最大曲げ M<sub>min</sub> (-)</td>
                                                <td className="p-1 font-mono font-bold">{sb.minM.toFixed(2)} kN·m</td>
                                                <td className="p-1 font-mono">{(sb.minM_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 font-mono">{(Math.abs(sb.minM) * 1e6 / sectionProps.Z).toFixed(0)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-1 text-left pl-2">最大せん断 Q<sub>max</sub> (+)</td>
                                                <td className="p-1 font-mono font-bold">{sb.maxQ.toFixed(2)} kN</td>
                                                <td className="p-1 font-mono">{(sb.maxQ_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 text-slate-400">-</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-1 text-left pl-2">最大せん断 Q<sub>min</sub> (-)</td>
                                                <td className="p-1 font-mono font-bold">{sb.minQ.toFixed(2)} kN</td>
                                                <td className="p-1 font-mono">{(sb.minQ_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 text-slate-400">-</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-1 text-left pl-2">最大変位 δ<sub>max</sub> (+)</td>
                                                <td className="p-1 font-mono font-bold">{sb.maxD.toFixed(2)} mm</td>
                                                <td className="p-1 font-mono">{(sb.maxD_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 text-slate-400">-</td>
                                            </tr>
                                             <tr>
                                                <td className="p-1 text-left pl-2">最大変位 δ<sub>min</sub> (-)</td>
                                                <td className="p-1 font-mono font-bold">{sb.minD.toFixed(2)} mm</td>
                                                <td className="p-1 font-mono">{(sb.minD_x - offset).toFixed(3)} m</td>
                                                <td className="p-1 text-slate-400">-</td>
                                            </tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                    
                    <div className="avoid-break mt-2 border rounded p-2 bg-slate-50">
                         <div className="text-xs font-bold text-slate-600 mb-1">支点反力一覧</div>
                         <div className="flex flex-wrap gap-4">
                            {results.reactions.map((r, i) => (
                                <div key={i} className="text-xs font-mono">
                                    R<sub>{r.label}</sub> = <strong>{r.val.toFixed(2)}</strong> kN <span className="text-slate-400">(@{r.x.toFixed(1)}m)</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </section>

            <section className="mb-4 avoid-break">
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">4. 応力図 (SFD, BMD, Deflection)</h2>
                <div className="border rounded p-2 flex justify-center bg-white">
                    <AdvancedVisualizer {...params} forceWidth={580} />
                </div>
            </section>

            <section className="page-break"　>
                <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2 mb-2 bg-slate-50 py-1">5. 計算結果詳細（スパン別）</h2>
                <div className="grid grid-cols-1 gap-4">
                    {spanRanges.map((range, sIdx) => {
                        const spanPoints = finalPoiData.filter(p => p.x >= range.start - 1e-4 && p.x <= range.end + 1e-4);
                        if (spanPoints.length === 0) return null;

                        return (
                            <div key={sIdx} className="avoid-break mb-2">
                                <div className="text-xs font-bold bg-slate-100 px-2 py-1 border-t border-l border-r rounded-t text-slate-700">
                                    径間 {sIdx + 1} ({String.fromCharCode(65+sIdx)} - {String.fromCharCode(65+sIdx+1)}) 
                                    <span className="font-normal ml-2 text-slate-500">L = {range.len.toFixed(2)}m</span>
                                </div>
                                <table className="w-full text-xs text-right border border-slate-200">
                                    <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="p-1 border w-16 text-center">x (local)</th>
                                                <th className="p-1 border">せん断 Q (kN)</th>
                                                <th className="p-1 border">曲げ M (kN·m)</th>
                                                <th className="p-1 border">応力 σ (N/mm²)</th>
                                                <th className="p-1 border">たわみ δ (mm)</th>
                                            </tr>
                                    </thead>
                                    <tbody>
                                            {spanPoints.map((p, idx) => {
                                                const localX = Math.max(0, Math.min(range.len, p.x - range.start));
                                                
                                                // ★[MODIFIED] Force span index to get isolated span results
                                                const val = getResultAt(p.x, results, sectionProps, sIdx);

                                                return (
                                                    <tr key={idx} className="border-b">
                                                        <td className="p-1 border text-center font-mono bg-slate-50/50">{localX.toFixed(3)}</td>
                                                        <td className="p-1 border font-mono">{val?.Q?.toFixed(2)}</td>
                                                        <td className="p-1 border font-mono">{val?.M?.toFixed(2)}</td>
                                                        <td className="p-1 border font-mono">{val?.sigma?.toFixed(1)}</td>
                                                        <td className="p-1 border font-mono">{val?.deflection?.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

// --- Visual Components ---
export function SectionProfileView({ props }) {
  const { shape, dims, axis, matType, isManualMode } = props;
  const size = 100, scale = 0.8;
  const cx = size / 2, cy = size / 2;
  let pathD = "";
  
  if (matType === 'manual') {
      // Dummy H shape for manual mode
      const H=s(200), B=s(100), t1=s(6), t2=s(8);
      pathD = `M ${cx-B/2} ${cy-H/2} h ${B} v ${t2} h ${-(B-t1)/2} v ${H-2*t2} h ${(B-t1)/2} v ${t2} h ${-B} v ${-t2} h ${(B-t1)/2} v ${-(H-2*t2)} h ${-(B-t1)/2} z`;
      return <svg width="100%" height="100%" viewBox="0 0 100 100"><path d={pathD} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3" /><text x={50} y={50} textAnchor="middle" fontSize="10" fill="#64748b" dominantBaseline="middle">Manual</text></svg>;
  }

  if (!dims.H) return null;
  const maxDim = Math.max(dims.H, dims.B);
  function s(v) { return (v / maxDim) * size * scale; }
  
  if (matType === 'concrete') {
    // RC断面
    const w = s(dims.B), h = s(dims.H); 
    pathD = `M ${cx-w/2} ${cy-h/2} h ${w} v ${h} h ${-w} z`;
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <path d={pathD} fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
        <text x={cx} y={cy+h/2+10} textAnchor="middle" fontSize="8" fill="#475569">b={dims.B}</text>
        <text x={cx+w/2+2} y={cy} textAnchor="start" fontSize="8" fill="#475569">D={dims.H}</text>
      </svg>
    );
  } else {
    // 鋼材断面
    const H = s(dims.H), B = s(dims.B), t1 = s(dims.t1), t2 = s(dims.t2), C = s(dims.C_lip || 0);
    if (shape === 'H') pathD = `M ${cx-B/2} ${cy-H/2} h ${B} v ${t2} h ${-(B-t1)/2} v ${H-2*t2} h ${(B-t1)/2} v ${t2} h ${-B} v ${-t2} h ${(B-t1)/2} v ${-(H-2*t2)} h ${-(B-t1)/2} z`;
    else if (shape === 'Channel') pathD = `M ${cx-B/2} ${cy-H/2} h ${B} v ${t2} h ${-(B-t1)} v ${H-2*t2} h ${B-t1} v ${t2} h ${-B} z`;
    else if (shape === 'Angle') pathD = `M ${cx-B/2} ${cy-H/2} v ${H} h ${B} v ${-t2} h ${-(B-t1)} v ${-(H-t2)} z`;
    else if (shape === 'LipChannel') pathD = `M ${cx-B/2} ${cy-H/2} h ${B} v ${C} h ${-t2} v ${-(C-t2)} h ${-(B-t1-t2)} v ${H-2*t2} h ${B-t1-t2} v ${-(C-t2)} h ${t2} v ${C} h ${-B} z`;
    else if (shape.includes('SheetPile')) {
        const dH = H, dB = B, dt = t1;
        pathD = `M ${cx-dB/2} ${cy-dH/2} v ${dH} h ${dB} v ${-dH} h ${-dt} v ${dH-dt} h ${-(dB-2*dt)} v ${-(dH-dt)} z`;
    } else if (shape === 'SquarePipe') {
        const dH = H, dB = B, dt = t1;
        // Outer rectangle (CCW) + Inner rectangle (CW) to create a hole
        pathD = `M ${cx-dB/2} ${cy-dH/2} h ${dB} v ${dH} h ${-dB} z M ${cx-(dB-2*dt)/2} ${cy-(dH-2*dt)/2} v ${dH-2*dt} h ${dB-2*dt} v ${-(dH-2*dt)} z`;
    }
  }
  return <svg width="100%" height="100%" viewBox="0 0 100 100"><path d={pathD} fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" fillRule="evenodd" transform={axis === 'weak' ? `rotate(90, ${cx}, ${cy})` : ''} /></svg>;
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

// ★[MODIFIED] PoiTable: Discontinuity Handling
export function PoiTable({ finalPoiData, userPoi, setUserPoi, totalLength, spans, results, sectionProps }) {
  const addUserPoint = (globalX) => {
      const newId = Date.now();
      setUserPoi([...userPoi, { id: newId, x: globalX }]);
  };

  const updateUserPoint = (id, newGlobalX) => {
      setUserPoi(userPoi.map(p => p.id === id ? { ...p, x: newGlobalX } : p));
  };

  const removeUserPoint = (id) => {
      setUserPoi(userPoi.filter(p => p.id !== id));
  };

  const spanRanges = useMemo(() => {
    let currentX = 0; return spans.map(len => { const range = { start: currentX, end: currentX + len }; currentX += len; return range; });
  }, [spans]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold text-slate-600">着目点詳細 (スパン別)</h3></div>
      {spanRanges.map((range, sIdx) => {
        // Find points within this span range (inclusive of boundaries)
        const spanPoints = finalPoiData.filter(p => p.x >= range.start - 1e-4 && p.x <= range.end + 1e-4);
        
        return (
          <div key={sIdx} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 flex justify-between items-center">
                <span>径間 {sIdx + 1} ({String.fromCharCode(65+sIdx)} - {String.fromCharCode(65+sIdx+1)})</span>
                <div className="flex items-center gap-3">
                    <span className="font-normal opacity-70">スパン長: {spans[sIdx].toFixed(2)}m</span>
                    <button 
                        onClick={() => addUserPoint(range.start)} 
                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                        <Plus className="w-3 h-3"/> 追加
                    </button>
                </div>
            </div>
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 text-slate-400 border-b"><tr><th className="p-2 w-24">Local x (m)</th><th className="p-2">Q (kN)</th><th className="p-2">M (kN·m)</th><th className="p-2">σ (N/mm²)</th><th className="p-2">δ (mm)</th><th className="w-8"></th></tr></thead>
              <tbody className="divide-y">
                {spanPoints.map((p, idx) => {
                  const localX = Math.max(0, Math.min(spans[sIdx], p.x - range.start));
                  const isUser = p.type === 'user';
                  
                  // ★[MODIFIED] Force span index to get isolated span results
                  const val = getResultAt(p.x, results, sectionProps, sIdx);

                  return (
                    // ★[MODIFIED] Use stable p.id as key instead of index to prevent input focus loss
                    <tr key={p.id} className={isUser ? "bg-blue-50/20" : "hover:bg-slate-50"}>
                      <td className="p-2">
                          <div className="flex items-center gap-1">
                              {isUser ? (
                                  <PoiInput 
                                    id={p.id}
                                    globalX={p.x}
                                    rangeStart={range.start}
                                    onUpdate={updateUserPoint}
                                  />
                              ) : (
                                  <div className="flex items-center gap-2">
                                      <span className="font-mono text-slate-500 w-12">{localX.toFixed(3)}</span>
                                      <span className="text-[9px] px-1 bg-slate-200 rounded text-slate-500">Auto</span>
                                  </div>
                              )}
                              {isUser && <span className="text-[9px] text-slate-300">m</span>}
                          </div>
                      </td>
                      <td className="p-2 font-mono text-slate-600">{val?.Q?.toFixed(2)}</td>
                      <td className="p-2 font-mono text-slate-600">{val?.M?.toFixed(2)}</td>
                      <td className="p-2 font-mono text-slate-700">{val?.sigma?.toFixed(1)}</td>
                      <td className="p-2 font-mono text-blue-600 font-bold">{val?.deflection?.toFixed(2)}</td>
                      <td className="p-2 text-right">
                          {isUser && (
                              <button onClick={() => removeUserPoint(p.id)}><X className="w-3 h-3 text-slate-300 hover:text-red-500" /></button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function AdvancedVisualizer({ spans, supports, totalLength, loads, results, forceWidth }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(forceWidth || 600);
  
  useEffect(() => {
    if (forceWidth) {
        setWidth(forceWidth);
        return;
    }
    if(containerRef.current) setWidth(containerRef.current.clientWidth);
    const h = () => { if(containerRef.current) setWidth(containerRef.current.clientWidth); };
    window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, [forceWidth]);

  // ★[MODIFIED] Increased height and spacing between diagrams
  const height = 950, padding = { left: 50, right: 50, top: 40 };
  const scaleX = (v) => padding.left + (v / totalLength) * (width - padding.left - padding.right);
  
  // ★[MODIFIED] Vertical layout adjustments (Shifted +40px)
  const beamY = 120;
  const sfdY = 360; // 320 -> 360
  const bmdY = 610; // 570 -> 610
  const defY = 860; // 820 -> 860
  const graphH = 70;
  
  const { maxShear, maxM_pos, maxM_neg, maxDeflection } = results.bounds;
  const maxM = Math.max(Math.abs(maxM_pos), Math.abs(maxM_neg), 1), maxD = Math.max(Math.abs(maxDeflection), 0.1), maxQ = Math.max(Math.abs(maxShear), 1);
  const syQ = v => sfdY - (v/maxQ)*(graphH/2), syM = v => bmdY + (v/maxM)*(graphH/2), syD = v => defY + (v/maxD)*(graphH/2);
  const maxLoadMag = Math.max(...loads.map(l => Math.max(Math.abs(l.mag), Math.abs(l.magEnd || 0))), 1);
  const loadHScale = 40 / maxLoadMag;

  // [Step A] ラベル配置計算 (X座標固定・Y方向スタッキングのみ)
  const calculateLabelLayout = (rawPoints, baseY) => {
      // 1. ソート (左から右へ)
      // X座標自体はいじらず、純粋に並び順だけ整える
      let sorted = [...rawPoints].sort((a, b) => a.x - b.x);

      // ★削除: 以前あった「左右振り分け・Align変更ロジック」はここで完全廃止。

      const placedRects = []; 
      const results = [];
      
      // 定数設定 (v21.24の仕様を維持)
      const boxW = 120; // テキスト全体をカバーする幅
      const boxH = 16;  // 垂直方向のクリアランス

      sorted.forEach(p => {
          const originY = p.y;
          
          // 方向決定 (グラフの外側へ)
          const isVisuallyBelow = originY > baseY + 1; 
          const isVisuallyAbove = originY < baseY - 1; 
          let goUp;
          if (isVisuallyBelow) goUp = false;
          else if (isVisuallyAbove) goUp = true;
          else goUp = true;

          // 初期位置 (グラフ線に寄せる)
          const offsetUp = 10;
          const offsetDown = 12; 
          let candY = originY + (goUp ? -offsetUp : offsetDown);
          
          // 移動ステップ (矩形高さより大きくして隙間を作る)
          const shiftStep = goUp ? -17 : 17; 

          // 衝突判定
          for (let k = 0; k < 15; k++) { 
              let collision = false;
              for (const r of placedRects) {
                  const dx = Math.abs(p.x - r.x);
                  const dy = Math.abs(candY - r.y);
                  
                  // 厳密判定
                  if (dx < boxW && dy < boxH) {
                      collision = true;
                      break;
                  }
              }
              if (!collision) break; 
              candY += shiftStep;
          }

          // 確定位置を登録 (X座標はずらさない)
          placedRects.push({ x: p.x, y: candY }); 
          
          const showLine = Math.abs(candY - originY) > 25;
          
          // alignプロパティは返さない（JSX側で画面端判定のみさせる）
          results.push({ ...p, finalY: candY, originY, showLine });
      });

      return results;
  };

  // [Step B] データ収集ヘルパー
  const collectPoints = (dataArr, boundsArr, scaleYFunc, type) => {
      const points = [];
      if (!dataArr || dataArr.length === 0) return [];

      // 端点 (Start/End)
      // 始点近傍
      let startP = dataArr[0];
      for(let i=0; i<dataArr.length; i++) {
          if(dataArr[i].x > 0.0001) break;
          if(Math.abs(dataArr[i].y) > Math.abs(startP.y)) startP = dataArr[i];
      }
      points.push({ xVal: startP.x, val: startP.y });
      
      // 終点近傍
      let endP = dataArr[dataArr.length-1];
      const L = dataArr[dataArr.length-1].x;
      for(let i=dataArr.length-1; i>=0; i--) {
          if(dataArr[i].x < L - 0.0001) break;
          if(Math.abs(dataArr[i].y) > Math.abs(endP.y)) endP = dataArr[i];
      }
      points.push({ xVal: endP.x, val: endP.y });

      // スパンごとのピーク (spanBounds)
      boundsArr.forEach(sb => {
          if (type === 'M') {
              // BMD: 同じ位置なら絶対値が大きい方を採用（重複回避）
              if (Math.abs(sb.maxM_x - sb.minM_x) < 0.001) {
                  const val = Math.abs(sb.maxM) >= Math.abs(sb.minM) ? sb.maxM : sb.minM;
                  const x = Math.abs(sb.maxM) >= Math.abs(sb.minM) ? sb.maxM_x : sb.minM_x;
                  points.push({ xVal: x, val: val });
              } else {
                  points.push({ xVal: sb.maxM_x, val: sb.maxM });
                  points.push({ xVal: sb.minM_x, val: sb.minM });
              }
          } else if (type === 'Q') {
              points.push({ xVal: sb.maxQ_x, val: sb.maxQ });
              points.push({ xVal: sb.minQ_x, val: sb.minQ });
          } else { // Deflection
              points.push({ xVal: sb.maxD_x, val: sb.maxD });
              points.push({ xVal: sb.minD_x, val: sb.minD });
          }
      });

      // 重複除去と整形
      const uniquePoints = [];
      points.forEach(p => {
          // 既存リストに似たような点(X差<1mm, 値差<0.01)がなければ追加
          const exists = uniquePoints.some(ep => Math.abs(ep.xVal - p.xVal) < 0.001 && Math.abs(ep.val - p.val) < 0.01);
          if (!exists) {
              uniquePoints.push({
                  x: scaleX(p.xVal),
                  y: scaleYFunc(p.val),
                  val: p.val,
                  xVal: p.xVal,
                  unit: type === 'M' ? 'kN·m' : (type === 'Q' ? 'kN' : 'mm')
              });
          }
      });
      return uniquePoints;
  };

  // 各グラフのラベルデータ計算
  const sfdPoints = collectPoints(results.shearData, results.spanBounds, syQ, 'Q');
  const sfdLabels = calculateLabelLayout(sfdPoints, sfdY); 

  const bmdPoints = collectPoints(results.momentData, results.spanBounds, syM, 'M');
  const bmdLabels = calculateLabelLayout(bmdPoints, bmdY); 

  const defPoints = collectPoints(results.deflectionData, results.spanBounds, syD, 'D');
  const defLabels = calculateLabelLayout(defPoints, defY); 

  // 荷重テキストの重なり回避用（既存ロジック）
  const loadTextOccupied = useRef([]);
  loadTextOccupied.current = [];
  const getAdjustedLoadTextY = (x, yBase, isBottom) => {
      let y = yBase, shift = isBottom ? 13 : -13;
      for(let i=0; i<5; i++) {
         let collision = false;
         for (let l of loadTextOccupied.current) if (Math.abs(x - l.x) < 40 && Math.abs(y - l.y) < 12) { collision = true; break; }
         if (!collision) break;
         y += shift; 
      }
      loadTextOccupied.current.push({ x, y }); return y;
  };

  return (
    <div ref={containerRef} className="w-full select-none">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="5" refX="7.5" refY="2.5" orient="auto">
            <polygon points="0 0, 8 2.5, 0 5" fill={COLORS.load} />
          </marker>
        </defs>
        
        <g key={`${totalLength}-${spans.join('-')}`}>
          {(() => {
            const guidePoints = new Set([0, totalLength]);
            let cx = 0; spans.forEach(s => { cx += s; guidePoints.add(cx); });
            loads.forEach(l => { guidePoints.add(l.pos); if(l.type !== 'point') guidePoints.add(l.pos + l.length); });
            return Array.from(guidePoints).map((gx, i) => <line key={i} x1={scaleX(gx)} y1={beamY+20} x2={scaleX(gx)} y2={height-20} stroke={COLORS.guide} strokeWidth="0.5" strokeDasharray="3" opacity="0.3" />);
          })()}

          {/* 寸法表示 */}
          {spans.map((len, i) => {
             let sx_val = 0; for(let k=0; k<i; k++) sx_val += spans[k];
             const x1 = scaleX(sx_val), x2 = scaleX(sx_val + len);
             return (
               <g key={`dim-span-${i}`}>
                 <text x={(x1+x2)/2} y={beamY + 45} textAnchor="middle" fontSize="10" fill={COLORS.dim}>{len}m</text>
                 <line x1={x1} y1={beamY + 35} x2={x2} y2={beamY + 35} stroke={COLORS.dim} strokeWidth="0.8" />
                 <line x1={x1} y1={beamY + 32} x2={x1} y2={beamY + 38} stroke={COLORS.dim} strokeWidth="0.8" />
                 <line x1={x2} y1={beamY + 32} x2={x2} y2={beamY + 38} stroke={COLORS.dim} strokeWidth="0.8" />
               </g>
             );
          })}

          <line x1={scaleX(0)} y1={beamY} x2={scaleX(totalLength)} y2={beamY} stroke={COLORS.beam} strokeWidth="4" />
          
          {/* 支点アイコン */}
          {supports.map((type, i) => {
            let cx = 0; for(let k=0;k<i;k++) cx += (k<spans.length?spans[k]:0);
            const x = scaleX(cx); if (type === 'free') return null;
            let icon = (type === 'fixed') ? <line x1={x} y1={beamY-15} x2={x} y2={beamY+15} stroke={COLORS.support} strokeWidth="6"/> : (type === 'pin') ? <polygon points={`${x},${beamY} ${x-6},${beamY+10} ${x+6},${beamY+10}`} fill="none" stroke={COLORS.support} strokeWidth="2"/> : <g><polygon points={`${x},${beamY} ${x-6},${beamY+10} ${x+6},${beamY+10}`} fill="none" stroke={COLORS.support} strokeWidth="2"/><line x1={x-8} y1={beamY+13} x2={x+8} y2={beamY+13} stroke={COLORS.support} strokeWidth="1"/></g>;
            return <g key={`supp-label-${i}`}>{icon}<text x={x} y={beamY + 25} textAnchor="middle" fontSize="11" fontWeight="bold" fill={COLORS.support}>{String.fromCharCode(65 + i)}</text></g>;
          })}

          {/* 荷重描画 */}
          {(() => {
            const posStack = {}, negStack = {};
            return [...loads].sort((a, b) => a.pos - b.pos).map(l => {
                const isNeg = l.mag < 0, stack = isNeg ? negStack : posStack, key = Math.round(l.pos * 10), count = stack[key] || 0; stack[key] = count + 1;
                const shift = count * 30, x = scaleX(l.pos);
                const pointOffset = (l.type === 'point') ? 20 : 0;
                const h1 = Math.abs(l.mag) * loadHScale + pointOffset; 
                const currentBeamY = isNeg ? (beamY + shift) : (beamY - shift);
                const baseY = isNeg ? (currentBeamY + h1 + 15) : (currentBeamY - h1 - 5), textY = getAdjustedLoadTextY(x, baseY, isNeg), posTextY = isNeg ? (textY + 12) : (textY - 12);
              
                if(l.type==='point') {
                   const yS = isNeg ? currentBeamY + h1 : currentBeamY - h1, yE = isNeg ? currentBeamY + 5 : currentBeamY - 5;
                   return <g key={l.id}>{shift > 0 && <line x1={x} y1={currentBeamY} x2={x} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" />}<line x1={x} y1={yS} x2={x} y2={yE} stroke={COLORS.load} strokeWidth="2" markerEnd="url(#arrow)"/><text x={x} y={textY} textAnchor="middle" fontSize="10" fill={COLORS.load} fontWeight="bold">{l.mag}kN</text><text x={x} y={posTextY} textAnchor="middle" fontSize="9" fill={COLORS.dim}>x={l.pos}m</text></g>;
                } else if (l.type === 'moment') {
                   // ★[MODIFIED] 3/4 Circular Arrow
                   const yCenter = currentBeamY - 20;
                   const r = 16; 
                   const isCW = l.mag > 0;
                   
                   return <g key={l.id}>
                        {shift > 0 && <line x1={x} y1={currentBeamY} x2={x} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" />}
                        
                        <circle cx={x} cy={yCenter} r="2" fill={COLORS.load} />

                        {/* Arc */}
                        <path 
                            d={isCW 
                                ? `M ${x} ${yCenter-r} A ${r} ${r} 0 1 1 ${x-r} ${yCenter}` // Start 12, End 9 (CW)
                                : `M ${x} ${yCenter-r} A ${r} ${r} 0 1 0 ${x+r} ${yCenter}` // Start 12, End 3 (CCW)
                            } 
                            fill="none" 
                            stroke={COLORS.load} 
                            strokeWidth="2.5" 
                        />

                        {/* Arrow Tip (Triangle) - Adjusted orientation tangential to the circle at the end point */}
                        <path 
                            d={isCW 
                                ? `M ${x-r} ${yCenter-6} L ${x-r-5} ${yCenter+4} L ${x-r+5} ${yCenter+4} Z` // At 9 o'clock, pointing UP
                                : `M ${x+r} ${yCenter-6} L ${x+r-5} ${yCenter+4} L ${x+r+5} ${yCenter+4} Z` // At 3 o'clock, pointing UP
                            } 
                            fill={COLORS.load} 
                        />

                        <text x={x} y={yCenter - r - 8} textAnchor="middle" fontSize="10" fill={COLORS.load} fontWeight="bold">{l.mag}kN·m</text>
                        <text x={x} y={posTextY} textAnchor="middle" fontSize="9" fill={COLORS.dim}>x={l.pos}m</text>
                   </g>;
                } else {
                   const x2 = scaleX(l.pos + l.length), mag2 = l.type === 'trapezoid' ? l.magEnd : l.mag, h2 = Math.abs(mag2) * loadHScale, y1P = isNeg ? currentBeamY + h1 : currentBeamY - h1, y2P = mag2 < 0 ? currentBeamY + h2 : currentBeamY - h2;
                   
                   if ((l.mag > 0 && mag2 < 0) || (l.mag < 0 && mag2 > 0)) {
                      const ratio = Math.abs(l.mag) / (Math.abs(l.mag) + Math.abs(mag2));
                      const xMid = x + (x2 - x) * ratio;
                      return (
                        <g key={l.id}>
                          {shift > 0 && <g><line x1={x} y1={currentBeamY} x2={x} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" /><line x1={x2} y1={currentBeamY} x2={x2} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" /></g>}
                          <polygon points={`${x},${currentBeamY} ${x},${y1P} ${xMid},${currentBeamY}`} fill={COLORS.loadPolygon} />
                          <polygon points={`${xMid},${currentBeamY} ${x2},${y2P} ${x2},${currentBeamY}`} fill={COLORS.loadPolygon} />
                          <line x1={x} y1={y1P} x2={xMid} y2={currentBeamY} stroke={COLORS.load} strokeWidth="1.5"/>
                          <line x1={xMid} y1={currentBeamY} x2={x2} y2={y2P} stroke={COLORS.load} strokeWidth="1.5"/>
                          <text x={x} y={textY} textAnchor="end" fontSize="10" fill={COLORS.load} fontWeight="bold">{l.mag}kN/m</text>
                          <text x={x2} y={getAdjustedLoadTextY(x2, (mag2 < 0 ? currentBeamY + h2 + 15 : currentBeamY - h2 - 5), mag2 < 0)} textAnchor="start" fontSize="10" fill={COLORS.load} fontWeight="bold">{mag2}kN/m</text>
                        </g>
                      );
                   }
                   
                   return <g key={l.id}>{shift > 0 && <g><line x1={x} y1={currentBeamY} x2={x} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" /><line x1={x2} y1={currentBeamY} x2={x2} y2={beamY} stroke={COLORS.load} strokeWidth="1" strokeDasharray="2" opacity="0.5" /></g>}<polygon points={`${x},${currentBeamY} ${x},${y1P} ${x2},${y2P} ${x2},${currentBeamY}`} fill={COLORS.loadPolygon} /><line x1={x} y1={y1P} x2={x2} y2={y2P} stroke={COLORS.load} strokeWidth="1.5"/><text x={x} y={textY} textAnchor="end" fontSize="10" fill={COLORS.load} fontWeight="bold">{l.mag}kN/m</text><text x={x2} y={getAdjustedLoadTextY(x2, (mag2 < 0 ? currentBeamY + h2 + 15 : currentBeamY - h2 - 5), mag2 < 0)} textAnchor="start" fontSize="10" fill={COLORS.load} fontWeight="bold">{mag2}kN/m</text><text x={(x+x2)/2} y={posTextY} textAnchor="middle" fontSize="9" fill={COLORS.dim}>x={l.pos}~{(l.pos+l.length).toFixed(1)}m</text></g>;
                }
            });
          })()}

          {/* 解析結果グラフ (SFD) */}
          <g>
            <text x={10} y={sfdY - 75} fontSize="10" fontWeight="bold" fill={COLORS.shearLine}>せん断力図 (SFD) [kN]</text>
            <line x1={scaleX(0)} y1={sfdY} x2={scaleX(totalLength)} y2={sfdY} stroke="#cbd5e1" strokeDasharray="2"/>
            <path d={`M ${scaleX(0)} ${sfdY} ` + results.shearData.map(p=>`L ${scaleX(p.x)} ${syQ(p.y)}`).join(' ') + ` L ${scaleX(totalLength)} ${sfdY}`} fill={COLORS.shearFill} opacity="0.6"/><path d={`M ${scaleX(0)} ${syQ(results.shearData[0]?.y||0)} ` + results.shearData.map(p=>`L ${scaleX(p.x)} ${syQ(p.y)}`).join(' ')} fill="none" stroke={COLORS.shearLine} strokeWidth="1.5"/>
            
            {/* ★[MODIFIED] Use Pre-calculated Labels */}
            {sfdLabels.map((lbl, i) => {
                const anchor = (lbl.x < padding.left + 40) ? "start" : (lbl.x > width - padding.right - 40) ? "end" : "middle";
                const showLine = lbl.showLine;
                return (
                    <g key={i}>
                        {showLine && <line x1={lbl.x} y1={lbl.originY} x2={lbl.x} y2={lbl.finalY + (lbl.val>=0?5:-5)} stroke={COLORS.shearLine} strokeWidth="0.5" opacity="0.5" />}
                        <text x={lbl.x} y={lbl.finalY} textAnchor={anchor} fontSize="10" fill={COLORS.shearLine} fontWeight="bold">
                            {lbl.val > 0 ? '+' : ''}{lbl.val.toFixed(2)}{lbl.unit} <tspan fontSize="9" fill={COLORS.dim} dx="4">(x={lbl.xVal.toFixed(3)}m)</tspan>
                        </text>
                        <circle cx={lbl.x} cy={lbl.originY} r="2" fill={COLORS.shearLine} />
                    </g>
                );
            })}
          </g>

          {/* 解析結果グラフ (BMD) */}
          <g>
            <text x={10} y={bmdY - 75} fontSize="10" fontWeight="bold" fill={COLORS.momentLine}>曲げモーメント図 (BMD) [kN·m]</text>
            <line x1={scaleX(0)} y1={bmdY} x2={scaleX(totalLength)} y2={bmdY} stroke="#cbd5e1" strokeDasharray="2"/>
            <path d={`M ${scaleX(0)} ${bmdY} ` + results.momentData.map(p=>`L ${scaleX(p.x)} ${syM(p.y)}`).join(' ') + ` L ${scaleX(totalLength)} ${bmdY}`} fill={COLORS.momentFill} opacity="0.6"/><path d={`M ${scaleX(0)} ${syM(results.momentData[0]?.y||0)} ` + results.momentData.map(p=>`L ${scaleX(p.x)} ${syM(p.y)}`).join(' ')} fill="none" stroke={COLORS.momentLine} strokeWidth="1.5"/>
            
            {/* ★[MODIFIED] Use Pre-calculated Labels */}
            {bmdLabels.map((lbl, i) => {
                const anchor = (lbl.x < padding.left + 40) ? "start" : (lbl.x > width - padding.right - 40) ? "end" : "middle";
                const showLine = lbl.showLine;
                return (
                    <g key={i}>
                        {showLine && <line x1={lbl.x} y1={lbl.originY} x2={lbl.x} y2={lbl.finalY + (lbl.val>=0?5:-5)} stroke={COLORS.momentLine} strokeWidth="0.5" opacity="0.5" />}
                        <text x={lbl.x} y={lbl.finalY} textAnchor={anchor} fontSize="10" fill={COLORS.momentLine} fontWeight="bold">
                            {lbl.val > 0 ? '+' : ''}{lbl.val.toFixed(2)}{lbl.unit} <tspan fontSize="9" fill={COLORS.dim} dx="4">(x={lbl.xVal.toFixed(3)}m)</tspan>
                        </text>
                        <circle cx={lbl.x} cy={lbl.originY} r="2" fill={COLORS.momentLine} />
                    </g>
                );
            })}
          </g>

          {/* 解析結果グラフ (Deflection) */}
          <g>
            <text x={10} y={defY - 75} fontSize="10" fontWeight="bold" fill={COLORS.deflLine}>変位図 (たわみ) [mm]</text>
            <line x1={scaleX(0)} y1={defY} x2={scaleX(totalLength)} y2={defY} stroke="#cbd5e1" strokeDasharray="2"/>
            <path d={`M ${scaleX(0)} ${defY} ` + results.deflectionData.map(p=>`L ${scaleX(p.x)} ${syD(p.y)}`).join(' ') + ` L ${scaleX(totalLength)} ${defY}`} fill={COLORS.deflFill} opacity="0.4"/><path d={`M ${scaleX(0)} ${syD(results.deflectionData[0]?.y||0)} ` + results.deflectionData.map(p=>`L ${scaleX(p.x)} ${syD(p.y)}`).join(' ')} fill="none" stroke={COLORS.deflLine} strokeWidth="1.5"/>
            
            {/* ★[MODIFIED] Use Pre-calculated Labels */}
            {defLabels.map((lbl, i) => {
                const anchor = (lbl.x < padding.left + 40) ? "start" : (lbl.x > width - padding.right - 40) ? "end" : "middle";
                const showLine = lbl.showLine;
                return (
                    <g key={i}>
                        {showLine && <line x1={lbl.x} y1={lbl.originY} x2={lbl.x} y2={lbl.finalY + (lbl.val>=0?5:-5)} stroke={COLORS.deflLine} strokeWidth="0.5" opacity="0.5" />}
                        <text x={lbl.x} y={lbl.finalY} textAnchor={anchor} fontSize="10" fill={COLORS.deflLine} fontWeight="bold">
                            {lbl.val > 0 ? '+' : ''}{lbl.val.toFixed(2)}{lbl.unit} <tspan fontSize="9" fill={COLORS.dim} dx="4">(x={lbl.xVal.toFixed(3)}m)</tspan>
                        </text>
                        <circle cx={lbl.x} cy={lbl.originY} r="2" fill={COLORS.deflLine} />
                    </g>
                );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
