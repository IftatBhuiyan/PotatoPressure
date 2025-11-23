import React, { useState, useEffect } from 'react';
import { useGame } from '../state/store';
import { DeckConfig, Snapshot, CardName } from '../types';
import { CARD_CONFIG } from '../constants';

const DEFAULT_CONFIG: DeckConfig = {
    redCount: 27,    // Movement
    blueCount: 12,   // Defense
    greenCount: 5,   // Toppings (per type)
    yellowCount: 6,  // Chaos
    potatoCount: 3,  // Potatoes
    advancedMode: false,
    cardCounts: {}
};

export const DebugPanel: React.FC = () => {
    const { state, dispatch } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'hands' | 'snapshots'>('general');

    // Config State
    const [config, setConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
    const [playerCount, setPlayerCount] = useState(2);

    // Manual Hand State
    const [initialHands, setInitialHands] = useState<Record<number, string[]>>({});
    const [selectedPlayerForHand, setSelectedPlayerForHand] = useState<number | null>(null);

    // Manual Draw State
    const [manualDrawMode, setManualDrawMode] = useState(false);
    const [selectedCard, setSelectedCard] = useState<string>(Object.keys(CARD_CONFIG)[0]);

    // Snapshots State
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [snapshotName, setSnapshotName] = useState("");
    // Calculate effective count for a specific card based on config
    const getEffectiveCardCount = (cardName: string) => {
        if (config.advancedMode && config.cardCounts && typeof config.cardCounts[cardName] === 'number') {
            return config.cardCounts[cardName];
        }

        const cardData = CARD_CONFIG[cardName as CardName];
        if (!cardData) return 0;

        if (cardData.category === 'potato') {
            return Math.floor(config.potatoCount / 1); // Only 1 potato type
        } else if (cardData.category === 'topping') {
            return config.greenCount;
        } else if (cardData.category === 'defense') {
            const baseTotal = 12;
            const ratio = config.blueCount / baseTotal;
            return Math.round(cardData.count * ratio);
        } else if (cardData.category === 'movement') {
            const baseTotal = 27;
            const ratio = config.redCount / baseTotal;
            return Math.round(cardData.count * ratio);
        } else if (cardData.category === 'chaos') {
            const baseTotal = 6;
            const ratio = config.yellowCount / baseTotal;
            return Math.round(cardData.count * ratio);
        }
        return 0;
    };

    // Calculate stats
    const totalCards = Object.keys(CARD_CONFIG).reduce((sum, name) => sum + getEffectiveCardCount(name), 0);

    const cardsInHandsCount = (Object.values(initialHands) as string[][]).reduce((sum, hand) => sum + hand.length, 0);

    const remainingCards = totalCards - cardsInHandsCount;

    const getRemainingByCategory = () => {
        const usedCounts: Record<string, number> = {};
        Object.values(initialHands).flat().forEach((name: any) => {
            if (typeof name === 'string') {
                usedCounts[name] = (usedCounts[name] || 0) + 1;
            }
        });

        const stats: Record<string, { total: number, remaining: number }> = {};

        Object.keys(CARD_CONFIG).forEach(name => {
            const cat = CARD_CONFIG[name as CardName].category;
            const total = getEffectiveCardCount(name);
            const used = usedCounts[name] || 0;

            if (!stats[cat]) stats[cat] = { total: 0, remaining: 0 };
            stats[cat].total += total;
            stats[cat].remaining += Math.max(0, total - used);
        });

        return stats;
    };

    const categoryStats = getRemainingByCategory();

    // Load snapshots on mount
    useEffect(() => {
        const saved = localStorage.getItem('pp_snapshots');
        if (saved) {
            try {
                setSnapshots(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load snapshots", e);
            }
        }
    }, []);

    const saveSnapshots = (newSnapshots: Snapshot[]) => {
        setSnapshots(newSnapshots);
        localStorage.setItem('pp_snapshots', JSON.stringify(newSnapshots));
    };

    const handleStartTest = () => {
        dispatch({
            type: 'START_GAME',
            payload: {
                config,
                playerCount,
                initialHands
            }
        });
    };

    const handleManualDraw = () => {
        if (!state.currentPlayerId) return;
        dispatch({
            type: 'DEBUG_DRAW_SPECIFIC',
            payload: { playerId: state.currentPlayerId, cardName: selectedCard }
        });
    };

    const handleSaveSnapshot = () => {
        if (!snapshotName) return;
        const newSnapshot: Snapshot = {
            name: snapshotName,
            date: Date.now(),
            config,
            playerCount,
            initialHands,
            // We could save gameState too if we wanted mid-game saves
        };
        saveSnapshots([...snapshots, newSnapshot]);
        setSnapshotName("");
    };

    const handleLoadSnapshot = (snap: Snapshot) => {
        setConfig(snap.config);
        setPlayerCount(snap.playerCount);
        setInitialHands(snap.initialHands || {});
        alert(`Loaded snapshot: ${snap.name}`);
    };

    const handleRemoveSnapshot = (index: number) => {
        const newSnapshots = snapshots.filter((_, i) => i !== index);
        saveSnapshots(newSnapshots);
    };

    const addToHand = (playerIdx: number, cardName: string) => {
        const currentHand = initialHands[playerIdx] || [];
        setInitialHands({
            ...initialHands,
            [playerIdx]: [...currentHand, cardName]
        });
    };

    const removeFromHand = (playerIdx: number, cardIndex: number) => {
        const currentHand = initialHands[playerIdx] || [];
        const newHand = [...currentHand];
        newHand.splice(cardIndex, 1);
        setInitialHands({
            ...initialHands,
            [playerIdx]: newHand
        });
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-20 right-4 z-[100] bg-slate-800 text-white p-2 rounded shadow-lg border border-slate-600 hover:bg-slate-700 text-xs font-mono"
            >
                🛠 DEBUG
            </button>
        );
    }

    return (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-slate-600 w-96 max-h-[85vh] overflow-y-auto backdrop-blur-sm flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h2 className="font-bold text-yellow-500">Testing Interface</h2>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>

            {/* TABS */}
            <div className="flex space-x-1 mb-4 bg-slate-800 p-1 rounded-lg">
                {['general', 'advanced', 'hands', 'snapshots'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-1 text-[10px] uppercase font-bold rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                {/* --- GENERAL TAB --- */}
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Player Count</span>
                                <span>{playerCount}</span>
                            </div>
                            <input
                                type="range" min="2" max="8"
                                value={playerCount}
                                onChange={e => setPlayerCount(parseInt(e.target.value))}
                                className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-4 border-t border-slate-700 pt-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase">Deck Balance</h3>
                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-slate-300">
                                    Total: <span className="text-white font-bold">{totalCards}</span>
                                </span>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-red-400">Movement (Red)</span>
                                    <span>{config.redCount}</span>
                                </div>
                                <input
                                    type="range" min="10" max="50"
                                    value={config.redCount}
                                    onChange={e => setConfig({ ...config, redCount: parseInt(e.target.value) })}
                                    className="w-full accent-red-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-blue-400">Defense (Blue)</span>
                                    <span>{config.blueCount}</span>
                                </div>
                                <input
                                    type="range" min="0" max="30"
                                    value={config.blueCount}
                                    onChange={e => setConfig({ ...config, blueCount: parseInt(e.target.value) })}
                                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-green-400">Toppings (Per Type)</span>
                                    <span>{config.greenCount}</span>
                                </div>
                                <input
                                    type="range" min="0" max="20"
                                    value={config.greenCount}
                                    onChange={e => setConfig({ ...config, greenCount: parseInt(e.target.value) })}
                                    className="w-full accent-green-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-yellow-400">Chaos (Yellow)</span>
                                    <span>{config.yellowCount}</span>
                                </div>
                                <input
                                    type="range" min="0" max="20"
                                    value={config.yellowCount}
                                    onChange={e => setConfig({ ...config, yellowCount: parseInt(e.target.value) })}
                                    className="w-full accent-yellow-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-amber-600">Potatoes</span>
                                    <span>{config.potatoCount}</span>
                                </div>
                                <input
                                    type="range" min="0" max="20"
                                    value={config.potatoCount}
                                    onChange={e => setConfig({ ...config, potatoCount: parseInt(e.target.value) })}
                                    className="w-full accent-amber-600 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ADVANCED TAB --- */}
                {activeTab === 'advanced' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Advanced Mode</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-slate-300">
                                    Total: <span className="text-white font-bold">{totalCards}</span>
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.advancedMode}
                                        onChange={e => setConfig({ ...config, advancedMode: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                </label>
                            </div>
                        </div>

                        {config.advancedMode ? (
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400">Override specific card counts. 0 = Default/None.</p>
                                {Object.keys(CARD_CONFIG).sort().map(cardName => (
                                    <div key={cardName} className="flex justify-between items-center bg-slate-800 p-2 rounded">
                                        <span className="text-xs">{cardName}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={config.cardCounts?.[cardName] ?? CARD_CONFIG[cardName as CardName].count}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                setConfig({
                                                    ...config,
                                                    cardCounts: {
                                                        ...config.cardCounts,
                                                        [cardName]: val
                                                    }
                                                });
                                            }}
                                            className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-right text-xs"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 text-slate-500 text-xs italic">
                                Enable Advanced Mode to customize individual card counts.
                            </div>
                        )}
                    </div>
                )}

                {/* --- HANDS TAB --- */}
                {activeTab === 'hands' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700 text-[10px] space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total Cards in Deck:</span>
                                <span className="text-white font-bold">{totalCards}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Cards Assigned:</span>
                                <span className="text-blue-400 font-bold">{cardsInHandsCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Remaining in Deck:</span>
                                <span className="text-emerald-400 font-bold">{remainingCards}</span>
                            </div>
                            <div className="pt-1 mt-1 border-t border-slate-700/50">
                                <span className="text-slate-500 block mb-1">Remaining by Category:</span>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                    {Object.entries(categoryStats).map(([cat, stat]) => (
                                        <div key={cat} className="flex justify-between">
                                            <span className="capitalize text-slate-400">{cat}:</span>
                                            <span className={`${stat.remaining < 0 ? 'text-red-500' : 'text-slate-300'}`}>{stat.remaining}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-slate-500 italic mt-2 pt-1 border-t border-slate-700/50">
                                Note: Players with unedited hands will receive random cards from the remaining deck.
                            </p>
                        </div>

                        <p className="text-[10px] text-slate-400">Set initial hands for players. These cards will be removed from the deck.</p>

                        {Array.from({ length: playerCount }).map((_, idx) => (
                            <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-blue-300">Player {idx + 1}</span>
                                    <button
                                        onClick={() => setSelectedPlayerForHand(selectedPlayerForHand === idx ? null : idx)}
                                        className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
                                    >
                                        {selectedPlayerForHand === idx ? 'Done' : 'Edit Hand'}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1 min-h-[24px]">
                                    {(initialHands[idx] || []).map((card, cIdx) => (
                                        <span key={cIdx} className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-600 flex items-center gap-1">
                                            {card}
                                            {selectedPlayerForHand === idx && (
                                                <button onClick={() => removeFromHand(idx, cIdx)} className="text-red-400 hover:text-red-300">×</button>
                                            )}
                                        </span>
                                    ))}
                                    {(initialHands[idx] || []).length === 0 && <span className="text-[10px] text-slate-600 italic">Empty Hand</span>}
                                </div>

                                {selectedPlayerForHand === idx && (
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                        <select
                                            className="w-full bg-slate-900 text-xs p-1 rounded mb-1"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addToHand(idx, e.target.value);
                                                    e.target.value = "";
                                                }
                                            }}
                                        >
                                            <option value="">+ Add Card...</option>
                                            {Object.keys(CARD_CONFIG).sort().map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* --- SNAPSHOTS TAB --- */}
                {activeTab === 'snapshots' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Snapshot Name"
                                value={snapshotName}
                                onChange={e => setSnapshotName(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 text-xs"
                            />
                            <button
                                onClick={handleSaveSnapshot}
                                disabled={!snapshotName}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1 rounded text-xs font-bold"
                            >
                                Save
                            </button>
                        </div>

                        <div className="space-y-2">
                            {snapshots.length === 0 && <p className="text-center text-slate-500 text-xs py-4">No saved snapshots.</p>}
                            {snapshots.map((snap, i) => {
                                // Helper to calc total cards for snapshot
                                const getSnapTotal = (c: DeckConfig) => {
                                    if (c.advancedMode) {
                                        return Object.keys(CARD_CONFIG).reduce((total, key) => {
                                            const count = c.cardCounts?.[key] ?? CARD_CONFIG[key as CardName].count;
                                            return total + count;
                                        }, 0);
                                    }
                                    return c.redCount + c.blueCount + (c.greenCount * 6) + c.yellowCount + c.potatoCount;
                                };

                                const snapTotal = getSnapTotal(snap.config);
                                const handsCount = Object.values(snap.initialHands || {}).filter((h) => (h as string[]).length > 0).length;

                                return (
                                    <div key={i} className="bg-slate-800 p-2 rounded flex justify-between items-center border border-slate-700">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="text-xs font-bold text-white">{snap.name}</div>
                                                <div className="text-[9px] text-slate-500">{new Date(snap.date).toLocaleDateString()}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400">
                                                <span>Players: <span className="text-slate-200">{snap.playerCount}</span></span>
                                                <span>Cards: <span className="text-slate-200">{snapTotal}</span></span>
                                                <span>Mode: <span className={snap.config.advancedMode ? "text-purple-400" : "text-slate-500"}>{snap.config.advancedMode ? "Adv" : "Basic"}</span></span>
                                                <span>Hands: <span className={handsCount > 0 ? "text-blue-400" : "text-slate-500"}>{handsCount > 0 ? `${handsCount} Set` : "Random"}</span></span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 ml-2">
                                            <button onClick={() => handleLoadSnapshot(snap)} className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded">Load</button>
                                            <button onClick={() => handleRemoveSnapshot(i)} className="text-[10px] bg-red-600 hover:bg-red-500 px-2 py-1 rounded">×</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER ACTIONS --- */}
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={handleStartTest}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-sm shadow-lg transition-colors"
                    >
                        Start Test Game
                    </button>
                    <button
                        onClick={() => {
                            if (confirm("Reset all settings to default?")) {
                                setConfig(DEFAULT_CONFIG);
                                setPlayerCount(2);
                                setInitialHands({});
                                setManualDrawMode(false);
                            }
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-xs text-slate-300 transition-colors"
                        title="Reset to Defaults"
                    >
                        ↺
                    </button>
                </div>

                {/* Manual Draw (Always visible or just in general?) Let's keep it here */}
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300">Manual Draw</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={manualDrawMode} onChange={e => setManualDrawMode(e.target.checked)} className="sr-only peer" />
                            <div className="w-7 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                        </label>
                    </div>
                    {manualDrawMode && (
                        <div className="flex gap-2">
                            <select
                                value={selectedCard}
                                onChange={e => setSelectedCard(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded p-1"
                            >
                                {Object.keys(CARD_CONFIG).sort().map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleManualDraw}
                                disabled={state.status !== 'PLAYING'}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1 rounded text-xs font-bold"
                            >
                                Draw
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
