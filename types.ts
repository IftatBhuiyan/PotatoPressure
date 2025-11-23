
export type CardCategory = "topping" | "defense" | "movement" | "chaos" | "potato";

export type CardName =
  | "Cheese" | "Butter" | "Sour Cream" | "Chives" | "Bacon" | "Chilli"
  | "Oven Mitt" | "Scoop" | "Freeze"
  | "Passutla" | "Pass" | "Quick Pass" | "Reverse"
  | "Food Fight" | "Double Dip" | "Rewind"
  | "Potato";

export interface Card {
  id: string;
  name: CardName;
  category: CardCategory;
  description: string;
}

export interface PotatoState {
  id: string;
  toppingCount: number;
  holderId: string;
  isFrozen: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  isAlive: boolean;
  hand: Card[];
  // potatoIds removed from here, potato ownership is tracked on the PotatoState itself
}

export type GameStatus = "LOBBY" | "PLAYING" | "GAME_OVER";

export type TurnPhase =
  | "awaitingAction"        // Player must Play or Draw
  | "selectTarget"          // Waiting for user to click a player or potato
  | "resolvingCard"         // System resolving effect
  | "checkingExplosion"     // System checking limits
  | "discarding"            // Player must discard down to 4
  | "awaitingReaction"      // Oven Mitt / Quick Pass interruption
  | "selectingReactionTarget" // Choosing where to redirect potato (Oven Mitt only)
  | "foodFightSelect"       // Players choosing cards to pass
  | "postAction"            // Window to play Offensive Quick Pass
  | "endTurn";              // Transition

export interface ReactionContext {
  initiatorId: string; // Player who played the Pass card
  defenderId: string;  // Player who was targeted and has Oven Mitt/Quick Pass
  potatoId: string;    // The potato being passed
  originalCardId: string; // The ID of the Pass card played
  reactionCardName: 'Oven Mitt' | 'Quick Pass'; // Which card triggered this
}

export interface GameState {
  status: GameStatus;
  players: PlayerState[];
  potatoes: PotatoState[];
  deck: Card[];
  discard: Card[];

  direction: "clockwise" | "counterclockwise";
  currentPlayerId: string;

  turnPhase: TurnPhase;

  // State for current turn logic
  cardsDrawnThisTurn: number;
  pendingCardId: string | null; // Card being played
  doubleDipActive: boolean;     // If true, next effect happens 2x

  reactionContext?: ReactionContext; // Context for interruptions
  foodFightSelections: Record<string, string>; // playerId -> cardId selected for food fight

  notification: string | null;
  winnerId: string | null;

  // Snapshot for Rewind card
  lastPlaySnapshot?: {
    potatoes: PotatoState[];
    direction: "clockwise" | "counterclockwise";
  };
}

export type GameAction =
  | { type: "JOIN_GAME"; payload?: { playerId: string; playerName: string } }
  | { type: "REMOVE_PLAYER"; payload: { playerId: string } }
  | { type: "START_GAME"; payload?: { config?: DeckConfig; initialHands?: Record<number, string[]>; playerCount?: number } }
  | { type: "DRAW_EXECUTE"; payload: number }
  | { type: "PLAY_CARD_INIT"; payload: string }
  | { type: "SELECT_TARGET"; payload: string }
  | { type: "RESPOND_TO_PASS"; payload: 'REFLECT' | 'PASS_FORWARD' | 'DECLINE' | boolean }
  | { type: "RESOLVE_REACTION_TARGET"; payload: string }
  | { type: "SELECT_FOOD_FIGHT_CARD"; payload: { playerId: string; cardId: string } }
  | { type: "CANCEL_PLAY"; payload?: undefined }
  | { type: "DISCARD_CARD"; payload: string }
  | { type: "SKIP_POST_ACTION"; payload?: undefined }
  | { type: "END_TURN"; payload?: undefined }
  | { type: "RESTART"; payload?: undefined }
  | { type: 'DEBUG_ADD_CARD'; payload: { playerId: string; cardName: string } }
  | { type: 'DEBUG_DRAW_SPECIFIC'; payload: { playerId: string; cardName: string } }
  | { type: 'LOAD_SNAPSHOT'; payload: Snapshot };


export interface DeckConfig {
  redCount: number;    // Movement
  blueCount: number;   // Defense
  greenCount: number;  // Toppings (per type)
  yellowCount: number; // Chaos
  potatoCount: number; // Potatoes

  // Advanced Mode
  advancedMode?: boolean;
  cardCounts?: Record<string, number>; // Specific overrides per card name
}

export interface Snapshot {
  name: string;
  date: number;
  config: DeckConfig;
  playerCount: number;
  initialHands?: Record<number, string[]>; // Player Index -> List of Card Names
  gameState?: GameState; // For mid-game saves
}
