import { Card, CardName, PlayerState, PotatoState, DeckConfig } from '../types';
import { CARD_CONFIG } from '../constants';

export const generateDeck = (config?: DeckConfig): Card[] => {
  let deck: Card[] = [];
  let idCounter = 0;

  Object.entries(CARD_CONFIG).forEach(([name, cardData]) => {
    let count = cardData.count;

    // LOGIC:
    // If config is present, we override counts.
    if (config) {
      if (config.advancedMode && config.cardCounts) {
        // Advanced Mode: Use specific counts if available, otherwise default to 0 or base?
        // Let's default to base if not specified, or 0?
        // "Advanced... allows for the player to modify the amount of each specific cards"
        // Usually implies full control. If key exists, use it.
        if (typeof config.cardCounts[name] === 'number') {
          count = config.cardCounts[name];
        }
      } else {
        // Group Sliders Logic
        if (cardData.category === 'potato') {
          count = Math.floor(config.potatoCount / 1); // Only 1 potato type
        } else if (cardData.category === 'topping') {
          count = config.greenCount; // "0-20 per topping"
        } else if (cardData.category === 'defense') {
          // Blue Cards: Range ±10 of base total (12).
          // We have 3 types: Oven Mitt (5), Scoop (5), Freeze (2). Total 12.
          // We need to scale these to match config.blueCount.
          const baseTotal = 12;
          const ratio = config.blueCount / baseTotal;
          count = Math.round(cardData.count * ratio);
        } else if (cardData.category === 'movement') {
          // Red Cards: Base 27.
          const baseTotal = 27;
          const ratio = config.redCount / baseTotal;
          count = Math.round(cardData.count * ratio);
        } else if (cardData.category === 'chaos') {
          // Yellow Cards: Base 6.
          const baseTotal = 6;
          const ratio = config.yellowCount / baseTotal;
          count = Math.round(cardData.count * ratio);
        }
      }
    }

    for (let i = 0; i < count; i++) {
      deck.push({
        id: `c-${idCounter++}`,
        name: name as CardName,
        category: cardData.category,
        description: cardData.desc,
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

export const dealGame = (playerNames: string[], config?: DeckConfig, initialHands?: Record<number, string[]>) => {
  // 1. Create Deck
  let deck = generateDeck(config);

  const playerCount = playerNames.length;
  const hands: Card[][] = Array(playerCount).fill(null).map(() => []);

  // 1.5 Handle Initial Hands (Manual Setup)
  if (initialHands) {
    Object.entries(initialHands).forEach(([playerIdxStr, cardNames]) => {
      const pIdx = parseInt(playerIdxStr);
      if (pIdx >= playerCount) return;

      cardNames.forEach(cardName => {
        // Find card in deck
        const cardIndex = deck.findIndex(c => c.name === cardName);
        if (cardIndex !== -1) {
          // Move from deck to hand
          hands[pIdx].push(deck[cardIndex]);
          deck.splice(cardIndex, 1);
        } else {
          // Create a new card if not in deck (God mode)
          // Or just ignore? "Select the hands... it should working properly with the rest of the game settings"
          // If we requested 10 potatoes in config, and used 3 here, we should take from deck.
          // If we request a card not in deck, let's create it to honor the manual setup.
          const baseCard = CARD_CONFIG[cardName as CardName];
          if (baseCard) {
            hands[pIdx].push({
              id: `manual-${Date.now()}-${Math.random()}`,
              name: cardName as CardName,
              category: baseCard.category,
              description: baseCard.desc
            });
          }
        }
      });
    });
  }

  // 2. Separate Potatoes
  const potatoes = deck.filter(c => c.category === 'potato');
  const normalDeck = deck.filter(c => c.category !== 'potato');

  // 3. Shuffle Normal Deck
  let shuffledNormal = shuffle(normalDeck);

  // 4. Fill Hands to Minimums
  // Player 0 needs 1 potato if they don't have one?
  // Rule: "Force 1 Potato to Player 0 (Start player condition)"
  // If Player 0 already has a potato from manual setup, skip this?
  // Let's check.
  const p0HasPotato = hands[0].some(c => c.category === 'potato');
  if (!p0HasPotato) {
    const startPotato = potatoes.pop();
    if (startPotato) hands[0].push(startPotato);
  }

  // Deal rest of hand 0 (up to 3 normal cards + potato = 4 total? Or just fill to 4?)
  // Original logic: "Deal rest of hand 0 (3 cards)" -> implies 3 normal cards.
  // With manual setup, we should probably just fill up to 4 cards total?
  // Or if manual setup provided > 4 cards, keep them?
  // Let's fill up to 4 if < 4.

  // Fill Player 0
  while (hands[0].length < 4) {
    const c = shuffledNormal.pop();
    if (c) hands[0].push(c);
    else break;
  }

  // Deal other players (fill to 4)
  for (let p = 1; p < playerCount; p++) {
    while (hands[p].length < 4) {
      const c = shuffledNormal.pop();
      if (c) hands[p].push(c);
      else break;
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
