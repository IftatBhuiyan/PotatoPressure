
import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { GameState, GameAction, TurnPhase } from '../types';
import * as Deck from '../logic/deck';
import * as Engine from '../logic/engine';
import { MAX_HAND_SIZE } from '../constants';

const initialState: GameState = {
    status: 'LOBBY',
    players: [],
    potatoes: [],
    deck: [],
    discard: [],
    direction: 'clockwise',
    currentPlayerId: '',
    turnPhase: 'awaitingAction',
    cardsDrawnThisTurn: 0,
    pendingCardId: null,
    doubleDipActive: false,
    foodFightSelections: {},
    notification: null,
    winnerId: null
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
        case 'JOIN_GAME': {
            if (state.status !== 'LOBBY') return state;
            const newPlayer = { id: `p-${state.players.length}`, name: action.payload, isAlive: true, hand: [] };
            return { ...state, players: [...state.players, newPlayer] };
        }
        case 'REMOVE_PLAYER': {
            if (state.status !== 'LOBBY') return state;
            return { ...state, players: state.players.filter(p => p.id !== action.payload) };
        }
        case 'START_GAME': {
            if (state.players.length < 2) return state;
            const { players, potatoes, deck } = Deck.dealGame(state.players.map(p => p.name));
            return {
                ...state,
                status: 'PLAYING',
                players,
                potatoes,
                deck,
                discard: [],
                currentPlayerId: players[0].id,
                turnPhase: 'awaitingAction',
                cardsDrawnThisTurn: 0,
                direction: 'clockwise',
                foodFightSelections: {},
                notification: "Game Started! Good luck."
            };
        }

        case 'DRAW_EXECUTE': {
            const count = action.payload;
            let tempState = { ...state };

            for (let i = 0; i < count; i++) {
                const result = Engine.drawCardLogic(tempState, tempState.currentPlayerId);
                tempState = result.state;
                if (!result.card) break;
            }

            // Drawing ends turn immediately
            return gameReducer({ ...tempState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
        }

        case 'PLAY_CARD_INIT': {
            // Allow playing during awaitingAction OR postAction (for Quick Pass chaining)
            if (state.turnPhase !== 'awaitingAction' && state.turnPhase !== 'postAction') return state;

            const cardId = action.payload;
            const player = state.players.find(p => p.id === state.currentPlayerId);
            const card = player?.hand.find(c => c.id === cardId);

            if (!card || !player) return state;

            // --- RESTRICTION: POST ACTION PHASE IS ONLY FOR QUICK PASS ---
            if (state.turnPhase === 'postAction') {
                if (card.name !== 'Quick Pass') {
                    return { ...state, notification: "You can only chain a Quick Pass right now!" };
                }
            }

            // --- RULE: RESTRICT MOVEMENT IF NO POTATO HELD ---
            const isMovementCard = ['Pass', 'Passutla', 'Quick Pass'].includes(card.name);
            if (isMovementCard) {
                const hasPotato = player.hand.some(c => c.category === 'potato');
                if (!hasPotato) {
                    return { ...state, notification: `You can't use ${card.name} without a Potato!` };
                }
            }

            // Rule: Can't play Potato card directly to discard
            if (card.category === 'potato') {
                return { ...state, notification: "You can't discard a Potato! Pass it with a card." };
            }

            // --- FOOD FIGHT LOGIC ---
            if (card.name === 'Food Fight') {
                const newHand = player.hand.filter(c => c.id !== cardId);
                return {
                    ...state,
                    players: state.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
                    discard: [...state.discard, card],
                    turnPhase: 'foodFightSelect',
                    foodFightSelections: {},
                    notification: "FOOD FIGHT! Everyone select a card to pass."
                };
            }

            // --- SNAPSHOT FOR REWIND ---
            // We save the state BEFORE the card effect is applied.
            // BUT, if the card is REWIND, we do NOT overwrite the snapshot, we use it.
            let snapshot = state.lastPlaySnapshot;
            if (card.name !== 'Rewind') {
                snapshot = {
                    potatoes: state.potatoes,
                    direction: state.direction
                };
            }

            // --- PREPARE STATE FOR PLAY ---
            // Remove card from hand and add to discard immediately
            const newHand = player.hand.filter(c => c.id !== cardId);
            let newState = {
                ...state,
                players: state.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
                discard: [...state.discard, card],
                pendingCardId: cardId,
                notification: null,
                lastPlaySnapshot: snapshot // Persist or update snapshot
            };

            const loops = state.doubleDipActive ? 2 : 1;

            // --- GLOBAL EFFECT CARDS (NO TARGETING) ---

            // 1. TOPPINGS: Add to ALL potatoes
            if (card.category === 'topping') {
                newState.doubleDipActive = false; // Consume double dip
                newState.pendingCardId = null;

                // Apply to ALL potatoes
                newState.potatoes = newState.potatoes.map(p =>
                    p.isFrozen ? p : { ...p, toppingCount: p.toppingCount + loops }
                );

                return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
            }

            // 2. SCOOP: Remove from ALL potatoes + Scavenge
            if (card.name === 'Scoop') {
                newState.doubleDipActive = false;
                newState.pendingCardId = null;

                // Apply reduction to ALL potatoes
                newState.potatoes = newState.potatoes.map(p =>
                    ({ ...p, toppingCount: Math.max(0, p.toppingCount - loops) })
                );

                // Scavenge logic (runs 'loops' times)
                for (let i = 0; i < loops; i++) {
                    const toppingIndex = newState.discard.map(c => c.category).lastIndexOf('topping');
                    if (toppingIndex !== -1) {
                        const toppingCard = newState.discard[toppingIndex];
                        const newDiscard = newState.discard.filter((_, idx) => idx !== toppingIndex);
                        const currentPlayerIdx = newState.players.findIndex(p => p.id === newState.currentPlayerId);
                        if (currentPlayerIdx !== -1) {
                            const currentPlayerHand = newState.players[currentPlayerIdx].hand;
                            const updatedPlayers = newState.players.map((p, idx) =>
                                idx === currentPlayerIdx ? { ...p, hand: [...currentPlayerHand, toppingCard] } : p
                            );
                            newState = { ...newState, discard: newDiscard, players: updatedPlayers };
                        }
                    }
                }

                return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
            }

            // --- PASSUTLA LOGIC: AUTO TARGET NEXT PLAYER ---
            if (card.name === 'Passutla') {
                const nextPlayerId = Engine.getNextPlayerId(state);
                // Auto-resolve with next player as target
                // We call SELECT_TARGET directly with the already modified state (card removed)
                return gameReducer(newState, { type: 'SELECT_TARGET', payload: nextPlayerId });
            }

            // --- TARGETED CARDS ---
            const needsTargetPlayer = ['Pass', 'Quick Pass'].includes(card.name);

            if (needsTargetPlayer) {
                return {
                    ...newState,
                    turnPhase: 'selectTarget',
                    notification: "Select a Player"
                };
            }

            // --- OTHER INSTANT CARDS ---
            // Double Dip, Reverse, Rewind, Freeze

            // Loop handling for simple effects
            for (let i = 0; i < loops; i++) {
                if (card.name === 'Reverse') {
                    newState.direction = newState.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
                } else if (card.name === 'Double Dip') {
                    if (i === 0) { // Double dip doesn't stack on itself typically to 4x, just activates status
                        newState.doubleDipActive = true;
                        newState.turnPhase = 'awaitingAction';
                        newState.notification = "Double Dip Active! Play another card.";
                        // Special return here because turn doesn't end
                        return newState;
                    }
                } else if (card.name === 'Freeze') {
                    newState.potatoes = newState.potatoes.map(p => p.holderId === newState.currentPlayerId ? { ...p, isFrozen: true } : p);
                } else if (card.name === 'Rewind') {
                    if (newState.lastPlaySnapshot) {
                        newState.potatoes = newState.lastPlaySnapshot.potatoes;
                        newState.direction = newState.lastPlaySnapshot.direction;
                        newState.notification = "Rewind! Last play undone.";
                    } else {
                        newState.notification = "Nothing to Rewind!";
                    }
                }
            }

            // Clear flags
            newState.doubleDipActive = false;
            newState.pendingCardId = null;

            return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
        }

        case 'SELECT_TARGET': {
            const targetId = action.payload;
            const cardId = state.pendingCardId;
            if (!cardId) return state;

            const card = state.discard.find(c => c.id === cardId);
            if (!card) return state;

            const loops = state.doubleDipActive ? 2 : 1;
            let newState = { ...state, doubleDipActive: false, pendingCardId: null, turnPhase: 'resolvingCard' as any };

            for (let i = 0; i < loops; i++) {
                if (['Passutla', 'Pass', 'Quick Pass'].includes(card.name)) {
                    const player = newState.players.find(p => p.id === newState.currentPlayerId);
                    // Get ANY potato held by player. We can pick the first one or the hottest one.
                    // Since we removed potato targeting, we assume passing *a* potato.
                    // Logic: Pass the one with highest toppings? Or just the first one?
                    // Let's Pass the First one found for simplicity, as UI doesn't distinguish well.
                    const potatoToPass = player?.hand.find(c => c.category === 'potato');

                    if (potatoToPass && targetId) {
                        // --- REACTION CHECK (Oven Mitt OR Quick Pass) ---
                        const targetPlayer = newState.players.find(p => p.id === targetId);

                        const ovenMitt = targetPlayer?.hand.find(c => c.name === 'Oven Mitt');
                        const quickPass = targetPlayer?.hand.find(c => c.name === 'Quick Pass');

                        // Only trigger interrupt on the first loop and if not already reacting
                        if (targetPlayer && (ovenMitt || quickPass)) {
                            const reactionCard = quickPass ? 'Quick Pass' : 'Oven Mitt';

                            return {
                                ...newState,
                                turnPhase: 'awaitingReaction',
                                reactionContext: {
                                    initiatorId: newState.currentPlayerId,
                                    defenderId: targetId,
                                    potatoId: potatoToPass.id,
                                    originalCardId: card.id,
                                    reactionCardName: reactionCard
                                },
                                notification: `${targetPlayer.name}, use ${reactionCard}?`
                            };
                        }

                        newState = Engine.transferPotato(newState, potatoToPass.id, targetId);
                    }
                }
            }

            return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
        }

        case 'SELECT_FOOD_FIGHT_CARD': {
            const { playerId, cardId } = action.payload;
            if (state.turnPhase !== 'foodFightSelect') return state;

            const newSelections = { ...state.foodFightSelections, [playerId]: cardId };
            const alivePlayers = state.players.filter(p => p.isAlive);

            if (alivePlayers.every(p => newSelections[p.id])) {
                let newState = { ...state, foodFightSelections: newSelections };
                newState = Engine.resolveFoodFight(newState);
                return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
            }

            return { ...state, foodFightSelections: newSelections };
        }

        case 'RESPOND_TO_PASS': {
            // Payload: 'REFLECT' | 'PASS_FORWARD' | 'DECLINE'
            const response = action.payload as 'REFLECT' | 'PASS_FORWARD' | 'DECLINE' | boolean;

            const context = state.reactionContext;
            if (!context) return state;

            const isDeclined = response === 'DECLINE' || response === false;

            if (isDeclined) {
                // Declined: Potato goes to defender as originally intended
                let newState = Engine.transferPotato(state, context.potatoId, context.defenderId);
                return gameReducer({ ...newState, reactionContext: undefined, turnPhase: 'endTurn' }, { type: 'END_TURN' });
            }

            // ACCEPTED/USED CARD Logic
            const defender = state.players.find(p => p.id === context.defenderId);
            if (!defender) return state;

            const cardName = context.reactionCardName;
            const reactionCard = defender.hand.find(c => c.name === cardName);

            if (!reactionCard) return state;

            // Consume the reaction card
            const newHand = defender.hand.filter(c => c.id !== reactionCard.id);
            let newState = {
                ...state,
                discard: [...state.discard, reactionCard],
                players: state.players.map(p => p.id === defender.id ? { ...p, hand: newHand } : p)
            };

            // Refill defender hand
            let loops = 0;
            while (newState.players.find(p => p.id === defender.id)!.hand.length < 4 && loops < 10) {
                const res = Engine.drawCardLogic(newState, defender.id);
                newState = res.state;
                loops++;
            }

            if (cardName === 'Quick Pass') {
                // QUICK PASS LOGIC
                if (response === 'REFLECT' || response === true) {
                    // Reflect back to Initiator
                    newState = Engine.transferPotato(newState, context.potatoId, context.initiatorId);
                } else if (response === 'PASS_FORWARD') {
                    // Pass to Next Player (relative to Defender)
                    const tempStateForCalc = { ...newState, currentPlayerId: defender.id };
                    const nextPlayerId = Engine.getNextPlayerId(tempStateForCalc);
                    newState = Engine.transferPotato(newState, context.potatoId, nextPlayerId);
                }

                return gameReducer({ ...newState, reactionContext: undefined, turnPhase: 'endTurn' }, { type: 'END_TURN' });

            } else {
                // OVEN MITT LOGIC (Assume payload was 'BOUNCE' or true)
                return {
                    ...newState,
                    turnPhase: 'selectingReactionTarget',
                    notification: "Select Left or Right to pass!"
                };
            }
        }

        case 'RESOLVE_REACTION_TARGET': {
            // Only for Oven Mitt redirection
            const targetId = action.payload;
            const context = state.reactionContext;
            if (!context) return state;

            let newState = Engine.transferPotato(state, context.potatoId, targetId);
            return gameReducer({ ...newState, reactionContext: undefined, turnPhase: 'endTurn' }, { type: 'END_TURN' });
        }

        case 'DISCARD_CARD': {
            if (state.turnPhase !== 'discarding') return state;
            const cardId = action.payload;
            const player = state.players.find(p => p.id === state.currentPlayerId);
            if (!player) return state;

            const card = player.hand.find(c => c.id === cardId);
            if (!card || card.category === 'potato') return state;

            const newHand = player.hand.filter(c => c.id !== cardId);
            const newState = {
                ...state,
                players: state.players.map(p => p.id === player.id ? { ...p, hand: newHand } : p),
                discard: [...state.discard, card]
            };

            if (newHand.length <= MAX_HAND_SIZE) {
                return gameReducer({ ...newState, turnPhase: 'endTurn' }, { type: 'END_TURN' });
            }
            return newState;
        }

        case 'CANCEL_PLAY':
            if (state.turnPhase === 'selectTarget' && state.pendingCardId) {
                const card = state.discard[state.discard.length - 1];
                if (card.id !== state.pendingCardId) return state;

                const player = state.players.find(p => p.id === state.currentPlayerId);
                if (!player) return state;

                return {
                    ...state,
                    discard: state.discard.slice(0, -1),
                    players: state.players.map(p => p.id === player.id ? { ...p, hand: [...p.hand, card] } : p),
                    pendingCardId: null,
                    turnPhase: 'awaitingAction',
                    notification: null
                };
            }
            return state;

        case 'SKIP_POST_ACTION': {
            if (state.turnPhase !== 'postAction') return state;
            return gameReducer({ ...state, turnPhase: 'endTurn' }, { type: 'END_TURN' });
        }

        case 'END_TURN': {
            let newState = { ...state };

            // --- CHECK OFFENSIVE QUICK PASS OPPORTUNITY ---
            const currentPlayer = newState.players.find(p => p.id === newState.currentPlayerId);
            const justPlayed = state.turnPhase === 'resolvingCard' || state.turnPhase === 'awaitingAction'; // Revised to catch immediate plays too

            // If we just played a card and are now here, we might be able to Quick Pass.
            // Note: PLAY_CARD_INIT calls END_TURN directly for Toppings/Scoop.

            if (currentPlayer) {
                const hasQuickPass = currentPlayer.hand.some(c => c.name === 'Quick Pass');
                const hasPotato = currentPlayer.hand.some(c => c.category === 'potato');

                // We only trigger post-action if we are NOT already in post-action skip or end logic
                // and if we actually played a card.
                // Simplified: If player has Quick Pass + Potato, give them a chance?
                // The rule says: "After playing ANY card on your turn".
                // Since END_TURN is called after playing, this is the place.

                if (hasQuickPass && hasPotato && state.turnPhase !== 'postAction') {
                    return {
                        ...newState,
                        turnPhase: 'postAction',
                        notification: "CHAIN: Play Quick Pass or End Turn?"
                    };
                }
            }

            // --- STANDARD END TURN LOGIC ---

            // 1. Refill Hand
            if (currentPlayer) {
                let loops = 0;
                while (currentPlayer.hand.length < 4 && loops < 10) {
                    const res = Engine.drawCardLogic(newState, currentPlayer.id);
                    newState = res.state;
                    const updatedPlayer = newState.players.find(p => p.id === newState.currentPlayerId);
                    if (!updatedPlayer || !res.card) break;
                    currentPlayer.hand = updatedPlayer.hand;
                    loops++;
                }
            }

            // 2. Check Explosion
            const explosionResult = Engine.checkExplosion(newState);
            newState = explosionResult.state;

            if (explosionResult.exploded) {
                const losers = newState.potatoes
                    .filter(p => p.toppingCount >= (1 + newState.players.filter(pl => pl.isAlive).length))
                    .map(p => p.holderId);

                const winners = newState.players
                    .filter(p => p.isAlive && !losers.includes(p.id))
                    .map(p => p.name);

                const winnerName = winners.length > 0 ? winners.join(', ') : 'Nobody';
                return { ...newState, status: 'GAME_OVER', winnerId: winnerName, notification: "EXPLOSION! Game Over!" };
            }

            // 3. Rotate
            const nextPlayerId = Engine.getNextPlayerId(newState);

            // Unfreeze potatoes held by the player who is ABOUT TO START their turn
            const thawedPotatoes = newState.potatoes.map(p =>
                p.holderId === nextPlayerId ? { ...p, isFrozen: false } : p
            );

            return {
                ...newState,
                potatoes: thawedPotatoes,
                currentPlayerId: nextPlayerId,
                turnPhase: 'awaitingAction',
                cardsDrawnThisTurn: 0,
                doubleDipActive: false,
                pendingCardId: null,
                reactionContext: undefined,
                notification: `Turn: ${newState.players.find(p => p.id === nextPlayerId)?.name}`
            };
        }

        case 'RESTART':
            return initialState;

        case 'DEBUG_ADD_CARD': {
            const { playerId, cardName } = action.payload;
            const player = state.players.find(p => p.id === playerId);
            if (!player) return state;

            // Create a dummy card
            const newCard = {
                id: `debug-${Date.now()}-${Math.random()}`,
                name: cardName,
                category: 'chaos', // Default category, doesn't matter much for Rewind
                description: 'Debug Card'
            } as any; // Cast to any to avoid strict category check if needed, or better:

            // Refine category based on name if possible, but for Rewind it's 'chaos'
            if (cardName === 'Rewind') newCard.category = 'chaos';

            return {
                ...state,
                players: state.players.map(p => p.id === playerId ? { ...p, hand: [...p.hand, newCard] } : p)
            };
        }

        default:
            return state;
    }
};

const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
}>({ state: initialState, dispatch: () => { } });

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
