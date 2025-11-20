import React, { useState } from 'react';
import { useGame } from '../state/store';
import { Card } from './Card';
import { Card as CardType, PlayerState } from '../types';

// --- Sub-components ---

const Lobby = () => {
    const { state, dispatch } = useGame();
    const [name, setName] = useState("");

    return (
        <div className="flex flex-col items-center justify-center h-full space-y-6 bg-slate-900 text-white">
            <h1 className="text-6xl font-black text-yellow-500 tracking-tighter">POTATO PRESSURE</h1>
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-96">
                <div className="space-y-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-300">Lobby</h2>
                    <div className="space-y-2">
                        {state.players.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-700 p-2 rounded">
                                <span>{p.name}</span>
                                <button onClick={() => dispatch({ type: 'REMOVE_PLAYER', payload: p.id })} className="text-red-400 hover:text-red-300">×</button>
                            </div>
                        ))}
                        {state.players.length === 0 && <p className="text-slate-500 italic">No players joined yet.</p>}
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter Name"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 outline-none focus:border-yellow-500"
                        onKeyDown={e => e.key === 'Enter' && name && (dispatch({ type: 'JOIN_GAME', payload: name }), setName(""))}
                    />
                    <button
                        disabled={!name}
                        onClick={() => { dispatch({ type: 'JOIN_GAME', payload: name }); setName(""); }}
                        className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-500 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>

                <button
                    disabled={state.players.length < 2}
                    onClick={() => dispatch({ type: 'START_GAME' })}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    START GAME
                </button>

                <button
                    onClick={() => {
                        dispatch({ type: 'JOIN_GAME', payload: "Player 1" });
                        dispatch({ type: 'JOIN_GAME', payload: "Player 2" });
                        dispatch({ type: 'JOIN_GAME', payload: "Player 3" });
                        setTimeout(() => dispatch({ type: 'START_GAME' }), 100);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm shadow-lg mt-2 opacity-80 hover:opacity-100"
                >
                    ⚡ Quick Start (3 Players)
                </button>

                <button
                    onClick={() => {
                        dispatch({ type: 'JOIN_GAME', payload: "Player 1" });
                        dispatch({ type: 'JOIN_GAME', payload: "Player 2" });
                        dispatch({ type: 'JOIN_GAME', payload: "Player 3" });
                        setTimeout(() => {
                            dispatch({ type: 'START_GAME' });
                            // Give Player 1 a Rewind card
                            // We need to wait for START_GAME to process so players have IDs
                            // Player 1 will be p-0
                            setTimeout(() => {
                                dispatch({ type: 'DEBUG_ADD_CARD', payload: { playerId: 'p-0', cardName: 'Rewind' } });
                            }, 100);
                        }, 100);
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-sm shadow-lg mt-2 opacity-80 hover:opacity-100"
                >
                    ⏪ Rewind Test Mode
                </button>
            </div>
        </div>
    );
};

// --- Main Board ---

export const GameBoard: React.FC = () => {
    const { state, dispatch } = useGame();

    if (state.status === 'LOBBY') return <Lobby />;

    const activePIndex = state.players.findIndex(p => p.id === state.currentPlayerId);
    const playerCount = state.players.length;

    const pivotIndex = 0;
    const perspectivePlayers = [];
    for (let i = 0; i < playerCount; i++) {
        perspectivePlayers.push(state.players[(pivotIndex + i) % playerCount]);
    }

    const bottomPlayer = perspectivePlayers[0];
    const leftPlayer = playerCount > 1 ? perspectivePlayers[1] : null;
    const topPlayer = playerCount > 2 ? perspectivePlayers[2] : null;
    const rightPlayer = playerCount > 3 ? perspectivePlayers[3] : null;

    const isDiscardPhase = state.turnPhase === 'discarding';
    const isFoodFightPhase = state.turnPhase === 'foodFightSelect';
    const isPostActionPhase = state.turnPhase === 'postAction';
    // Simplified targeting: Only players are targets now
    const isTargetPlayerMode = state.turnPhase === 'selectTarget';
    const activeCount = state.players.filter(p => p.isAlive).length;

    // --- Reaction Logic helpers ---
    const defender = state.players.find(p => p.id === state.reactionContext?.defenderId);
    const reactionCard = state.reactionContext?.reactionCardName;
    const isReactionPhase = state.turnPhase === 'awaitingReaction';
    const isReactionTargetPhase = state.turnPhase === 'selectingReactionTarget';

    // Find neighbors for reaction redirection
    const defenderIndex = state.players.findIndex(p => p.id === defender?.id);
    const leftNeighbor = defenderIndex !== -1 ? state.players[(defenderIndex + 1) % playerCount] : null;
    const rightNeighbor = defenderIndex !== -1 ? state.players[(defenderIndex - 1 + playerCount) % playerCount] : null;

    // --- Logic for Card Playability ---
    const isCardPlayable = (card: CardType, player: PlayerState) => {
        // Special Case: Food Fight Phase
        if (state.turnPhase === 'foodFightSelect') return true;

        // 1. Must be current player's turn
        if (state.currentPlayerId !== player.id) return false;

        // 2. Phase checks
        if (isPostActionPhase) {
            // Only Quick Pass is allowed
            return card.name === 'Quick Pass';
        }

        if (state.turnPhase === 'discarding') {
            return card.category !== 'potato';
        }

        if (state.turnPhase === 'awaitingAction') {
            if (card.category === 'potato') return false;

            // REACTION CARDS: Not playable as main action
            if (['Oven Mitt', 'Quick Pass'].includes(card.name)) return false;

            // POTATO DEPENDENCIES
            const hasPotatoesOnBoard = state.potatoes.length > 0;

            // SCOOP: Needs potatoes with toppings AND a topping in discard to scavenge
            if (card.name === 'Scoop') {
                if (!hasPotatoesOnBoard) return false;
                // We must have a topping in discard to scavenge
                const hasToppingInDiscard = state.discard.some(c => c.category === 'topping');
                return hasToppingInDiscard;
            }

            // TOPPINGS: Need a potato to put them on
            if (card.category === 'topping' && !hasPotatoesOnBoard) return false;

            // FREEZE / MOVEMENT: Need to HOLD a potato
            if (['Pass', 'Passutla', 'Freeze'].includes(card.name)) {
                if (!hasPotatoesOnBoard) return false;
                const hasPotato = player.hand.some(c => c.category === 'potato');
                return hasPotato;
            }

            return true;
        }
        return false;
    };

    // Generic handler for any hand
    const handleAnyHandClick = (playerId: string, cardId: string) => {
        if (isFoodFightPhase) {
            dispatch({ type: 'SELECT_FOOD_FIGHT_CARD', payload: { playerId, cardId } });
            return;
        }

        if (playerId !== state.currentPlayerId) return;

        if (state.turnPhase === 'awaitingAction' || state.turnPhase === 'postAction') {
            dispatch({ type: 'PLAY_CARD_INIT', payload: cardId });
        } else if (state.turnPhase === 'discarding') {
            dispatch({ type: 'DISCARD_CARD', payload: cardId });
        } else if (state.turnPhase === 'selectTarget') {
            dispatch({ type: 'CANCEL_PLAY' });
        }
    };

    const handleTargetSelect = (playerId: string, cardId: string) => {
        if (isReactionTargetPhase) {
            if (playerId === leftNeighbor?.id || playerId === rightNeighbor?.id) {
                dispatch({ type: 'RESOLVE_REACTION_TARGET', payload: playerId });
            }
            return;
        }

        if (isTargetPlayerMode) {
            dispatch({ type: 'SELECT_TARGET', payload: playerId });
        }
    };

    // Helper to render hands
    const renderOpponentHand = (player: typeof bottomPlayer, side: 'left' | 'right' | 'top') => {
        const isCurrent = player.id === state.currentPlayerId;
        const isReactionTarget = isReactionTargetPhase && (player.id === leftNeighbor?.id || player.id === rightNeighbor?.id);

        let containerStyle = "";
        let cardsFlowStyle = "";

        switch (side) {
            case 'left':
                containerStyle = "flex-col items-start gap-2";
                cardsFlowStyle = "flex-row -space-x-12 pl-2";
                break;
            case 'right':
                containerStyle = "flex-col items-end gap-2";
                cardsFlowStyle = "flex-row-reverse -space-x-12 pr-2";
                break;
            case 'top':
                containerStyle = "flex-col items-center gap-2";
                cardsFlowStyle = "flex-row -space-x-12";
                break;
        }

        return (
            <div className={`flex ${containerStyle} relative`}>
                <div className="text-white font-bold whitespace-nowrap flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-full border border-white/10 shadow-xl z-30">
                    {player.name} {!player.isAlive && '💀'}
                    {isCurrent && <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />}
                    {isFoodFightPhase && state.foodFightSelections[player.id] && <span className="text-xs bg-yellow-500 text-black px-1 rounded">READY</span>}
                </div>

                <div className={`flex ${cardsFlowStyle} ${isReactionPhase ? 'grayscale opacity-50' : ''}`}>
                    {player.hand.map((c, i) => {
                        const isPotato = c.category === 'potato';
                        const potatoData = isPotato ? state.potatoes.find(p => p.id === c.id) : undefined;
                        const isPending = state.pendingCardId === c.id;
                        const playable = isCardPlayable(c, player);
                        const isFoodFightSelected = state.foodFightSelections[player.id] === c.id;
                        const isInteractive = playable || (isCurrent && isPending);

                        return (
                            <div
                                key={c.id}
                                className={`transform transition-all duration-300 origin-center rotate-0 animate-deal
                                ${playable ? 'cursor-pointer hover:scale-105 hover:z-40' : ''}
                                ${isFoodFightSelected ? '-translate-y-8 z-50 ring-4 ring-yellow-500 rounded-lg' : ''}
                            `}
                                onClick={() => {
                                    if (playable) {
                                        handleAnyHandClick(player.id, c.id);
                                    } else if (isCurrent && state.turnPhase === 'selectTarget' && isPending) {
                                        dispatch({ type: 'CANCEL_PLAY' });
                                    }
                                }}
                            >
                                <Card
                                    card={c}
                                    hidden={false}
                                    potatoState={potatoData}
                                    activePlayersCount={activeCount}
                                    selected={isPending || isFoodFightSelected}
                                    disabled={!isInteractive}
                                />
                            </div>
                        );
                    })}
                </div>

                {(isTargetPlayerMode || isReactionTarget) && (
                    <div
                        onClick={() => handleTargetSelect(player.id, '')}
                        className={`
                        absolute inset-0 -m-4 border-4 rounded-xl cursor-pointer animate-pulse z-50 pointer-events-auto
                        ${isReactionTarget ? 'bg-blue-500/20 border-blue-400' : 'bg-green-500/20 border-green-400'}
                    `}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col">

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-slate-950/50 backdrop-blur flex items-center justify-between px-6 z-40 border-b border-white/10">
                <div className="text-yellow-500 font-bold text-xl">🥔 POTATO PRESSURE <span className="text-xs text-slate-400 font-normal ml-2">(DEBUG MODE)</span></div>
                <div className="text-white/70 text-sm font-semibold animate-pulse">
                    {state.notification || "Waiting..."}
                </div>
                <div className="flex gap-4 text-sm font-mono text-white">
                    <span>Explode at: <span className="text-red-400 font-bold text-lg">{1 + activeCount}</span></span>
                    <span>{state.direction === 'clockwise' ? '↻ CW' : '↺ CCW'}</span>
                </div>
            </div>

            {/* --- Reaction Modal --- */}
            {isReactionPhase && defender && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 p-8 rounded-xl border-2 border-blue-500 shadow-2xl flex flex-col items-center max-w-md text-center">
                        <div className="text-4xl mb-4">🧤</div>
                        <h2 className="text-2xl font-bold text-white mb-2">{reactionCard?.toUpperCase()} ALERT!</h2>
                        <p className="text-slate-300 mb-6">
                            <span className="text-yellow-400 font-bold">{defender.name}</span>, you are being passed a Potato!
                            <br />Choose your action:
                        </p>

                        <div className="flex gap-4 flex-wrap justify-center">
                            {reactionCard === 'Quick Pass' ? (
                                <>
                                    <button
                                        onClick={() => dispatch({ type: 'RESPOND_TO_PASS', payload: 'REFLECT' })}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
                                    >
                                        ↩ REFLECT (Return)
                                    </button>
                                    <button
                                        onClick={() => dispatch({ type: 'RESPOND_TO_PASS', payload: 'PASS_FORWARD' })}
                                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
                                    >
                                        ⚡ PASS FORWARD
                                    </button>
                                    <button
                                        onClick={() => dispatch({ type: 'RESPOND_TO_PASS', payload: 'DECLINE' })}
                                        className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
                                    >
                                        ✋ TAKE IT
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => dispatch({ type: 'RESPOND_TO_PASS', payload: 'REFLECT' })} // For Oven Mitt, this maps to 'BOUNCE' logic
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
                                    >
                                        BOUNCE IT
                                    </button>
                                    <button
                                        onClick={() => dispatch({ type: 'RESPOND_TO_PASS', payload: 'DECLINE' })}
                                        className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
                                    >
                                        TAKE IT
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Post Action Phase (Offensive Quick Pass) --- */}
            {isPostActionPhase && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[70]">
                    <button
                        onClick={() => dispatch({ type: 'SKIP_POST_ACTION' })}
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-lg text-lg animate-bounce"
                    >
                        END TURN (Skip Quick Pass)
                    </button>
                </div>
            )}

            {/* --- Table Area --- */}
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="relative w-96 h-64 flex items-center justify-center gap-12">
                    {/* Deck */}
                    <div
                        onClick={() => state.turnPhase === 'awaitingAction' && dispatch({ type: 'DRAW_EXECUTE', payload: 1 })}
                        className={`
                      w-32 h-48 bg-slate-700 rounded-xl border-4 border-slate-600 shadow-2xl 
                      flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform
                      relative group
                      ${state.turnPhase === 'awaitingAction' ? 'ring-4 ring-blue-400 animate-pulse' : ''}
                  `}
                    >
                        <div className="absolute inset-1 border-2 border-dashed border-slate-500 rounded-lg"></div>
                        <span className="text-4xl mb-1 group-hover:scale-110 transition-transform">🎴</span>
                        <span className="text-sm font-bold text-slate-400">DECK</span>
                        <span className="text-xs font-bold text-slate-500 mt-1">{state.deck.length} left</span>
                    </div>

                    {/* Discard */}
                    <div className="w-32 h-48 relative flex items-center justify-center">
                        {state.discard.length === 0 ? (
                            <div className="w-full h-full border-4 border-dashed border-slate-600 rounded-xl flex items-center justify-center text-slate-600 font-bold">DISCARD</div>
                        ) : (
                            state.discard.slice(-6).map((card, index) => {
                                const seed = card.id;
                                let hash = 0;
                                for (let i = 0; i < seed.length; i++) {
                                    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                // WIDER RANDOMNESS for Messy Pile effect
                                const rotation = (hash % 120) - 60; // +/- 60 degrees
                                const offsetX = (hash % 50) - 25;   // +/- 25px X
                                const offsetY = ((hash >> 3) % 40) - 20; // +/- 20px Y

                                return (
                                    <div
                                        key={card.id}
                                        className="absolute transition-all duration-500 shadow-md"
                                        style={{
                                            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
                                            zIndex: index
                                        }}
                                    >
                                        <Card card={card} disabled />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* --- Players --- */}
            {leftPlayer && <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">{renderOpponentHand(leftPlayer, "left")}</div>}
            {rightPlayer && <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">{renderOpponentHand(rightPlayer, "right")}</div>}
            {topPlayer && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">{renderOpponentHand(topPlayer, "top")}</div>}

            {/* --- BOTTOM: Local Player --- */}
            <div className="absolute bottom-0 left-0 right-0 h-72 flex flex-col items-center justify-end pb-4 z-30 pointer-events-none">
                <div className="pointer-events-auto relative flex flex-col items-center">

                    {/* TARGETING OVERLAY */}
                    {((isTargetPlayerMode && bottomPlayer.id !== state.currentPlayerId) ||
                        (isReactionTargetPhase && (bottomPlayer.id === leftNeighbor?.id || bottomPlayer.id === rightNeighbor?.id))) && (
                            <div
                                onClick={() => handleTargetSelect(bottomPlayer.id, '')}
                                className={`
                            absolute inset-0 -m-8 rounded-xl cursor-pointer animate-pulse z-50 border-4
                            ${isReactionTargetPhase ? 'bg-blue-500/20 border-blue-400' : 'bg-green-500/20 border-green-400'}
                        `}
                            />
                        )}

                    <div className="text-yellow-400 font-bold text-lg mb-4 flex items-center gap-2 bg-slate-900/80 px-4 py-1 rounded-full">
                        {bottomPlayer.id === state.currentPlayerId && <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />}
                        {bottomPlayer.name}
                        {state.doubleDipActive && bottomPlayer.id === state.currentPlayerId && <span className="text-xs bg-yellow-600 text-black px-2 rounded-full">DOUBLE DIP</span>}
                        {isFoodFightPhase && state.foodFightSelections[bottomPlayer.id] && <span className="text-xs bg-yellow-500 text-black px-1 rounded">READY</span>}
                    </div>

                    <div className={`flex -space-x-2 hover:space-x-2 transition-all duration-300 px-10 py-4 bg-gradient-to-t from-slate-950 to-transparent w-full justify-center rounded-t-xl ${isReactionPhase ? 'grayscale opacity-50' : ''}`}>
                        {bottomPlayer.hand.map((card) => {
                            const isPotato = card.category === 'potato';
                            const potatoData = isPotato ? state.potatoes.find(p => p.id === card.id) : undefined;
                            const isPending = state.pendingCardId === card.id;
                            const playable = isCardPlayable(card, bottomPlayer);
                            const isFoodFightSelected = state.foodFightSelections[bottomPlayer.id] === card.id;
                            const isInteractive = playable || (bottomPlayer.id === state.currentPlayerId && isPending);

                            return (
                                <div
                                    key={card.id}
                                    className={`
                                    transform transition-transform duration-200 hover:-translate-y-12 hover:z-50 hover:scale-110 animate-deal
                                    ${state.pendingCardId === card.id ? '-translate-y-10 z-40 scale-105' : ''}
                                    ${isFoodFightSelected ? '-translate-y-10 z-50 ring-4 ring-yellow-500 rounded-lg' : ''}
                                    ${isPostActionPhase && card.name === 'Quick Pass' ? 'ring-4 ring-red-500 animate-pulse z-50' : ''}
                                `}
                                >
                                    <Card
                                        card={card}
                                        selected={state.pendingCardId === card.id || isFoodFightSelected}
                                        disabled={!isInteractive}
                                        potatoState={potatoData}
                                        activePlayersCount={activeCount}
                                        onClick={() => {
                                            if (isFoodFightPhase) handleAnyHandClick(bottomPlayer.id, card.id);
                                            else if (playable) handleAnyHandClick(bottomPlayer.id, card.id);
                                            else if (isInteractive && state.turnPhase === 'selectTarget') dispatch({ type: 'CANCEL_PLAY' });
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {state.status === 'GAME_OVER' && (
                <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white">
                    <h1 className="text-6xl font-bold text-yellow-500 mb-4">GAME OVER</h1>
                    <p className="text-2xl mb-8">Winner: <span className="text-green-400 font-black">{state.winnerId === 'Draw' ? 'No one' : state.winnerId}</span></p>
                    <button
                        onClick={() => dispatch({ type: 'RESTART' })}
                        className="px-8 py-4 bg-white text-black text-xl font-bold rounded-full hover:scale-110 transition-transform"
                    >
                        Back to Lobby
                    </button>
                </div>
            )}
        </div>
    );
};