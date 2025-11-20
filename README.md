# Potato Pressure

**Potato Pressure** is a high-stakes hot-potato card game where players manage exploding potatoes while sabotaging their opponents with toppings and chaotic cards.

## 🥔 The Goal
Avoid holding a Potato when it explodes! The last player alive wins.

## 💥 Explosion Rules
A Potato explodes when its **Topping Count** reaches the **Threshold**.
*   **Threshold** = 1 + Number of Alive Players.
*   *Example (4 Players):* 1 + 4 = **5 Toppings** to explode.

When a potato explodes, the player holding it is eliminated.

## 🎮 Turn Structure
On your turn, you must do **ONE** of the following:
1.  **Play a Card**: Select a card from your hand to resolve its effect.
2.  **Draw a Card**: Click the deck to draw 1 card. **This ends your turn.**

*Note: You must always end your turn with at least 4 cards. The game automatically refills your hand if you drop below 4.*

## 🃏 Card Types

### 🥔 Potato Cards
*   **Potato**: The danger object. You want to get rid of this! It tracks toppings.
*   *Note: Potatoes count towards your hand limit but cannot be discarded normally. You must PASS them.*

### 🥬 Toppings (Green)
Add +1 Topping count to a Potato.
*   **Cheese, Butter, Sour Cream, Chives, Bacon, Chilli**

### 🛡️ Defense (Blue)
*   **Oven Mitt**: **Reaction Only.** If someone passes a potato to you, you can reveal this card to **Bounce** it to your Left or Right neighbor.
*   **Scoop**: Remove 1 Topping from a potato. *Condition: Requires a Topping card in the discard pile to "scavenge" (add to your hand).*
*   **Freeze**: Freezes your potato. No toppings can be added to it until your next turn.

### 🏸 Movement (Red)
*Requires holding a Potato to play.*
*   **Pass**: Pass your potato to **ANY** player.
*   **Passutla**: Pass your potato to the **NEXT** player (Turn order).
*   **Quick Pass**:
    *   **Defensive**: If passed a potato, you can **Reflect** it back to the sender or **Pass** it forward instantly.
    *   **Offensive (Combo)**: After playing any card on your turn, if you have a Quick Pass, you can chain it to pass your potato immediately.
*   **Reverse**: Reverses the direction of play (Clockwise ↔ Counter-Clockwise).

### 🌪️ Chaos (Yellow)
*   **Food Fight**: ALL players must select one card from their hand to pass to the left/right simultaneously.
*   **Double Dip**: The next card you play resolves **twice**.
*   **Rewind**: Undo the last action (effectively skips the previous player's turn or reverts a move).

## 🕹️ Controls
*   **Play Card**: Click a card in your hand.
*   **Draw**: Click the Deck.
*   **Targeting**: Click a Player or Potato when prompted.
*   **Reactions**: A modal will appear if you can use an Oven Mitt or Quick Pass to defend yourself.

## 🛠️ Developer Notes
*   **State Machine**: The game uses a React Context + Reducer pattern.
*   **Logic**: Pure functions in `logic/engine.ts` handle game rules.
*   **Hotseat**: The Debug Mode allows controlling all players for testing.
