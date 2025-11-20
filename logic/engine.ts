
import { GameState, PlayerState, PotatoState, Card } from '../types';
import { EXPLOSION_BASE } from '../constants';
import { shuffle } from './deck';

export const getNextPlayerId = (state: GameState): string => {
  const activePlayers = state.players; 
  const currentIndex = activePlayers.findIndex(p => p.id === state.currentPlayerId);
  if (currentIndex === -1) return state.currentPlayerId;

  let step = state.direction === 'clockwise' ? 1 : -1;
  let nextIndex = currentIndex;
  
  // Find next ALIVE player
  for (let i = 0; i < activePlayers.length; i++) {
      nextIndex = (nextIndex + step) % activePlayers.length;
      if (nextIndex < 0) nextIndex += activePlayers.length;
      if (activePlayers[nextIndex].isAlive) return activePlayers[nextIndex].id;
  }
  return state.currentPlayerId;
};

export const drawCardLogic = (state: GameState, playerId: string): { state: GameState, card: Card | null } => {
  let newDeck = [...state.deck];
  let newDiscard = [...state.discard];
  let newPotatoes = [...state.potatoes];
  let playerIndex = state.players.findIndex(p => p.id === playerId);
  
  if (newDeck.length === 0) {
    if (newDiscard.length === 0) return { state, card: null };
    // Use Fisher-Yates shuffle for fair distribution
    newDeck = shuffle(newDiscard);
    newDiscard = [];
  }

  const card = newDeck.pop();
  if (!card) return { state, card: null };

  const newPlayers = [...state.players];
  const player = newPlayers[playerIndex];

  // Logic update: Potato or not, it goes into the hand.
  newPlayers[playerIndex] = {
      ...player,
      hand: [...player.hand, card]
  };

  if (card.category === 'potato') {
      // SYNC LOGIC: New potato gets the count of the highest existing potato
      const maxExistingCount = newPotatoes.length > 0 
        ? Math.max(...newPotatoes.map(p => p.toppingCount)) 
        : 0;

      // Initialize Potato State
      newPotatoes.push({
          id: card.id,
          toppingCount: maxExistingCount, // Syncs with game time
          holderId: playerId,
          isFrozen: false
      });
  }

  return {
      state: {
          ...state,
          deck: newDeck,
          discard: newDiscard,
          players: newPlayers,
          potatoes: newPotatoes
      },
      card
  };
};

export const transferPotato = (state: GameState, potatoId: string, toPlayerId: string): GameState => {
    // 1. Find current owner
    const currentOwner = state.players.find(p => p.hand.some(c => c.id === potatoId));
    if (!currentOwner) return state; // Should not happen

    // 2. Find Potato Card Object
    const potatoCard = currentOwner.hand.find(c => c.id === potatoId);
    if (!potatoCard) return state;

    // 2.5 Handle Self-Transfer (Reflection)
    if (currentOwner.id === toPlayerId) {
        // Potato stays in hand, just ensure State owner ID matches (it should already, but for safety)
        const newPotatoes = state.potatoes.map(pot => 
            pot.id === potatoId ? { ...pot, holderId: toPlayerId } : pot
        );
        return { ...state, potatoes: newPotatoes };
    }

    // 3. Remove from Old Hand
    const newPlayers = state.players.map(p => {
        if (p.id === currentOwner.id) {
            return { ...p, hand: p.hand.filter(c => c.id !== potatoId) };
        }
        if (p.id === toPlayerId) {
            return { ...p, hand: [...p.hand, potatoCard] };
        }
        return p;
    });

    // 4. Update Potato State owner
    const newPotatoes = state.potatoes.map(pot => 
        pot.id === potatoId ? { ...pot, holderId: toPlayerId } : pot
    );

    return {
        ...state,
        players: newPlayers,
        potatoes: newPotatoes
    };
};

export const checkExplosion = (state: GameState): { exploded: boolean, state: GameState } => {
  const livingCount = state.players.filter(p => p.isAlive).length;
  const threshold = EXPLOSION_BASE + livingCount;
  
  const exploded = state.potatoes.some(p => p.toppingCount >= threshold);
  
  if (!exploded) return { exploded: false, state };
  
  return {
      exploded: true,
      state
  };
};

export const respawnPotato = (state: GameState): GameState => {
    // Find a potato in Deck or Discard to start the new round
    let potatoCard = state.deck.find(c => c.category === 'potato');
    let newDeck = [...state.deck];
    let newDiscard = [...state.discard];
    
    if (potatoCard) {
        newDeck = newDeck.filter(c => c.id !== potatoCard!.id);
    } else {
        potatoCard = state.discard.find(c => c.category === 'potato');
        if (potatoCard) {
            newDiscard = newDiscard.filter(c => c.id !== potatoCard!.id);
        }
    }

    // If absolutely no potato found (shouldn't happen), return state
    if (!potatoCard) return state;

    // Give to current player
    const playerIndex = state.players.findIndex(p => p.id === state.currentPlayerId);
    if (playerIndex === -1) return state;

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: [...newPlayers[playerIndex].hand, potatoCard]
    };

    const newPotatoState: PotatoState = {
        id: potatoCard.id,
        toppingCount: 0,
        holderId: state.currentPlayerId,
        isFrozen: false
    };

    return {
        ...state,
        deck: newDeck,
        discard: newDiscard,
        players: newPlayers,
        potatoes: [...state.potatoes, newPotatoState],
        notification: "A new Potato appears!"
    };
};

export const resolveFoodFight = (state: GameState): GameState => {
    const alivePlayers = state.players.filter(p => p.isAlive);
    const N = alivePlayers.length;
    const shift = state.direction === 'clockwise' ? 1 : -1;
    
    const extractionMap: Record<string, Card> = {}; // playerId -> Card
    
    let newPlayers = state.players.map(p => ({...p})); // clone
    
    alivePlayers.forEach(p => {
        const cardId = state.foodFightSelections[p.id];
        if (!cardId) return; 
        
        const card = p.hand.find(c => c.id === cardId);
        if (card) {
            extractionMap[p.id] = card;
            // Remove from hand
            const pIndex = newPlayers.findIndex(np => np.id === p.id);
            newPlayers[pIndex].hand = newPlayers[pIndex].hand.filter(c => c.id !== cardId);
        }
    });
    
    // Insert into neighbor's hand
    alivePlayers.forEach((p, i) => {
        const card = extractionMap[p.id];
        if (!card) return;
        
        let neighborIndex = (i + shift) % N;
        if (neighborIndex < 0) neighborIndex += N;
        
        const neighbor = alivePlayers[neighborIndex];
        
        const neighborMainIndex = newPlayers.findIndex(np => np.id === neighbor.id);
        newPlayers[neighborMainIndex].hand = [...newPlayers[neighborMainIndex].hand, card];
    });
    
    const newPotatoes = state.potatoes.map(pot => {
        const holder = newPlayers.find(p => p.hand.some(c => c.id === pot.id));
        return holder ? { ...pot, holderId: holder.id } : pot;
    });

    return {
        ...state,
        players: newPlayers,
        potatoes: newPotatoes,
        foodFightSelections: {},
        notification: "Food Fight! Cards swapped!"
    };
};
