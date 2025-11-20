
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

export interface GameAction {
  type:
  | "JOIN_GAME"
  | "REMOVE_PLAYER"
  | "START_GAME"
  | "DRAW_EXECUTE" // Helper to draw 1 card
  | "PLAY_CARD_INIT"
  | "SELECT_TARGET"
  | "RESPOND_TO_PASS" // Payload: 'REFLECT' | 'PASS_FORWARD' | 'DECLINE'
  | "RESOLVE_REACTION_TARGET" // Payload: targetId
  | "SELECT_FOOD_FIGHT_CARD" // Payload: { playerId, cardId }
  | "CANCEL_PLAY"
  | "DISCARD_CARD"
  | "SKIP_POST_ACTION" // For skipping offensive Quick Pass
  | "END_TURN"
  | "RESTART"
  | "DEBUG_ADD_CARD"; // Payload: { playerId: string, cardName: CardName }
  payload?: any;
}
