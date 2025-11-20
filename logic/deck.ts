
import { Card, CardName, PlayerState, PotatoState } from '../types';
import { CARD_CONFIG } from '../constants';

export const generateDeck = (): Card[] => {
  let deck: Card[] = [];
  let idCounter = 0;

  Object.entries(CARD_CONFIG).forEach(([name, config]) => {
    for (let i = 0; i < config.count; i++) {
      deck.push({
        id: `c-${idCounter++}`,
        name: name as CardName,
        category: config.category,
        description: config.desc,
      });
    }
  });

  return shuffle(deck);
};

export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const dealGame = (playerNames: string[]) => {
  // 1. Create Deck
  const deck = generateDeck();
  
  // 2. Separate Potatoes
  const potatoes = deck.filter(c => c.category === 'potato');
  const normalDeck = deck.filter(c => c.category !== 'potato');
  
  // 3. Shuffle Normal Deck
  let shuffledNormal = shuffle(normalDeck);
  
  const playerCount = playerNames.length;
  const hands: Card[][] = Array(playerCount).fill(null).map(() => []);
  
  // 4. Force 1 Potato to Player 0 (Start player condition)
  const startPotato = potatoes.pop();
  if (startPotato) hands[0].push(startPotato);
  
  // Deal rest of hand 0 (3 cards)
  for (let i = 0; i < 3; i++) {
    const c = shuffledNormal.pop();
    if (c) hands[0].push(c);
  }
  
  // Deal other players (4 cards)
  for (let p = 1; p < playerCount; p++) {
    for (let i = 0; i < 4; i++) {
      const c = shuffledNormal.pop();
      if (c) hands[p].push(c);
    }
  }
  
  // 5. Shuffle remaining potatoes back into the deck
  const finalDeck = shuffle([...shuffledNormal, ...potatoes]);

  // 6. Create PlayerStates and PotatoStates
  const players: PlayerState[] = [];
  const activePotatoes: PotatoState[] = [];
  
  playerNames.forEach((name, idx) => {
    const handCards = hands[idx];
    
    handCards.forEach(c => {
        if (c.category === 'potato') {
            // Create a Potato State entity keyed by the CARD ID
            activePotatoes.push({
                id: c.id, // IMPORTANT: Potato State ID matches Card ID
                toppingCount: 0,
                holderId: `p-${idx}`,
                isFrozen: false
            });
        }
    });

    players.push({
        id: `p-${idx}`,
        name,
        isAlive: true,
        hand: handCards // Potato is physically in the hand
    });
  });

  return {
      players,
      potatoes: activePotatoes,
      deck: finalDeck
  };
};
