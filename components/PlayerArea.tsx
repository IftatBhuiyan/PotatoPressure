import React from 'react';
import { PlayerState, PotatoState, GameState } from '../types';
import { Card } from './Card';
import { Potato } from './Potato';

interface PlayerAreaProps {
  player: PlayerState;
  isCurrent: boolean;
  potatoes: PotatoState[];
  gameState: GameState;
  onCardClick: (id: string) => void;
  onTargetClick: (targetId: string) => void; // Used for passing target or potato target
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({ 
  player, isCurrent, potatoes, gameState, onCardClick, onTargetClick 
}) => {
  
  const heldPotatoes = potatoes.filter(p => p.holderId === player.id);
  
  // Are we targeting this player?
  const isTargetablePlayer = gameState.turnPhase === 'selectTarget' && 
                             gameState.pendingCardId && 
                             ['Pass', 'Passutla', 'Quick Pass'].includes(
                                gameState.players.find(p => p.id === gameState.currentPlayerId)?.hand.find(c => c.id === gameState.pendingCardId)?.name || ''
                             ) && 
                             player.id !== gameState.currentPlayerId; // Can't pass to self usually? Rules say "Pass to ANY". Let's allow all except if logic restricts.

  const handleAreaClick = () => {
      if (isTargetablePlayer) {
          onTargetClick(player.id);
      }
  };

  return (
    <div 
        className={`
            relative flex flex-col items-center p-4 rounded-xl transition-all duration-500
            ${isCurrent ? 'bg-slate-700/50 ring-2 ring-yellow-400 scale-105' : 'bg-slate-800/30 opacity-80'}
            ${!player.isAlive ? 'grayscale opacity-40' : ''}
            ${isTargetablePlayer ? 'cursor-pointer bg-green-900/50 ring-4 ring-green-400 animate-pulse' : ''}
        `}
        onClick={handleAreaClick}
    >
      {/* Name & Status */}
      <div className="mb-2 font-bold text-lg flex gap-2 items-center">
        {player.name} 
        {isCurrent && <span className="text-yellow-400 text-xs">Wait...</span>}
        {!player.isAlive && <span className="text-red-500">☠️</span>}
      </div>

      {/* Potatoes Held */}
      <div className="flex gap-2 mb-4 min-h-[80px]">
        {heldPotatoes.map(p => {
             // Is this specific potato a target for toppings?
             const isTargetablePotato = gameState.turnPhase === 'selectTarget' && 
                gameState.pendingCardId && 
                (gameState.players.find(pl => pl.id === gameState.currentPlayerId)?.hand.find(c => c.id === gameState.pendingCardId)?.category === 'topping' || 
                 gameState.players.find(pl => pl.id === gameState.currentPlayerId)?.hand.find(c => c.id === gameState.pendingCardId)?.name === 'Scoop');
             
             return (
                <Potato 
                    key={p.id} 
                    potato={p} 
                    ownerName={player.name}
                    playerCount={gameState.players.length}
                    highlight={isTargetablePotato}
                    onClick={() => isTargetablePotato && onTargetClick(p.id)}
                />
             );
        })}
      </div>

      {/* Hand */}
      <div className="flex -space-x-8 hover:space-x-1 transition-all p-2">
        {player.hand.map((card) => (
          <div 
            key={card.id} 
            className="transform transition-transform hover:-translate-y-4 hover:z-10 hover:rotate-0 animate-deal"
          >
             {isCurrent || !player.isAlive ? (
                 <Card 
                    card={card} 
                    onClick={() => onCardClick(card.id)} 
                    disabled={!isCurrent || (gameState.turnPhase !== 'awaitingAction' && gameState.turnPhase !== 'postAction' && gameState.turnPhase !== 'discarding')}
                 />
             ) : (
                 // Card Back for opponents
                 <div className="w-16 h-24 bg-slate-600 rounded-lg border-2 border-slate-400 shadow-md flex items-center justify-center">
                    <div className="w-10 h-16 border border-slate-500 rounded bg-slate-700"></div>
                 </div>
             )}
          </div>
        ))}
      </div>
      
      <div className="text-xs mt-2 text-slate-400">Cards: {player.hand.length}</div>
    </div>
  );
};