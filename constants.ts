
import { CardName, CardCategory } from './types';

export const MAX_HAND_SIZE = 4;
export const EXPLOSION_BASE = 1; // Logic: Threshold = Base (1) + PlayerCount (4) = 5.

export const CARD_CONFIG: Record<CardName, { category: CardCategory; count: number; desc: string }> = {
  "Potato": { category: "potato", count: 3, desc: "Explodes with too many toppings!" },
  
  // Toppings (30 total)
  "Cheese": { category: "topping", count: 5, desc: "+1 Topping" },
  "Butter": { category: "topping", count: 5, desc: "+1 Topping" },
  "Sour Cream": { category: "topping", count: 5, desc: "+1 Topping" },
  "Chives": { category: "topping", count: 5, desc: "+1 Topping" },
  "Bacon": { category: "topping", count: 5, desc: "+1 Topping" },
  "Chilli": { category: "topping", count: 5, desc: "+1 Topping" },

  // Defense (12 total)
  "Oven Mitt": { category: "defense", count: 5, desc: "Bounce a passed Potato back." },
  "Scoop": { category: "defense", count: 5, desc: "Remove 1 Topping." },
  "Freeze": { category: "defense", count: 2, desc: "No toppings allowed until next turn." },

  // Movement (27 total: 14+6+4+3 = 27)
  "Passutla": { category: "movement", count: 14, desc: "Pass Potato to Next Player." },
  "Pass": { category: "movement", count: 4, desc: "Pass Potato to ANY Player." },
  "Quick Pass": { category: "movement", count: 6, desc: "Instant pass/reflect." },
  "Reverse": { category: "movement", count: 3, desc: "Reverse turn order." },
  
  // Chaos (6 total)
  "Food Fight": { category: "chaos", count: 2, desc: "Pass hand to the left." },
  "Double Dip": { category: "chaos", count: 3, desc: "Next card resolves twice." },
  "Rewind": { category: "chaos", count: 1, desc: "Undo last action (Skip Turn)." },
};
