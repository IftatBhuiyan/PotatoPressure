
import React from 'react';
import { Card as CardType, PotatoState } from '../types';
import { EXPLOSION_BASE } from '../constants';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  hidden?: boolean;
  potatoState?: PotatoState; // If this card is a potato, pass its state
  activePlayersCount?: number; // Needed to calc explosion risk
}

export const Card: React.FC<CardProps> = ({ card, onClick, disabled, selected, hidden, potatoState, activePlayersCount = 2 }) => {

  // Special Render for Hidden cards (Back of card)
  // Special Render for Hidden cards (Back of card)
  if (hidden) {
    return (
      <div className="w-24 h-36 rounded-lg border-2 border-slate-600 bg-slate-800 shadow-md flex items-center justify-center relative overflow-hidden">
        <img
          src="/card_back.png"
          alt="Card Back"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const getStyles = () => {
    switch (card.category) {
      case 'topping': return 'bg-green-100 border-green-600 text-green-900';
      case 'defense': return 'bg-blue-100 border-blue-600 text-blue-900';
      case 'movement': return 'bg-red-100 border-red-600 text-red-900';
      case 'chaos': return 'bg-yellow-100 border-yellow-600 text-yellow-900';
      case 'potato': return 'bg-amber-800 border-amber-950 text-white';
      default: return 'bg-gray-200 border-gray-400';
    }
  };

  const getIcon = () => {
    switch (card.name) {
      case 'Cheese': return '🧀';
      case 'Butter': return '🧈';
      case 'Sour Cream': return '🥣';
      case 'Bacon': return '🥓';
      case 'Chilli': return '🌶️';
      case 'Chives': return '🌿';
      case 'Oven Mitt': return '🧤';
      case 'Scoop': return '🥄';
      case 'Freeze': return '🧊';
      case 'Passutla': return '🏸';
      case 'Quick Pass': return '⚡';
      case 'Pass': return '➡️';
      case 'Reverse': return '↩️';
      case 'Food Fight': return '🍕';
      case 'Double Dip': return '🥣';
      case 'Rewind': return '⏪';
      case 'Potato': return '🥔';
      default: return '🃏';
    }
  };

  // --- Potato Specific Rendering ---
  if (card.category === 'potato' && potatoState) {
    const threshold = EXPLOSION_BASE + activePlayersCount;
    const ratio = potatoState.toppingCount / threshold;

    let potatoBg = "bg-amber-600";
    let pulse = "";
    if (ratio > 0.5) potatoBg = "bg-orange-600";
    if (ratio > 0.8) { potatoBg = "bg-red-600"; pulse = "animate-pulse"; }
    if (potatoState.isFrozen) { potatoBg = "bg-cyan-700"; }

    return (
      <div
        onClick={!disabled ? onClick : undefined}
        className={`
                w-24 h-36 rounded-xl border-4 border-amber-900 shadow-lg flex flex-col items-center justify-between p-2
                transition-all duration-200 select-none relative overflow-hidden
                ${potatoBg} ${pulse}
                ${disabled ? 'cursor-not-allowed brightness-75 grayscale' : 'cursor-pointer hover:-translate-y-2'}
                ${selected ? 'ring-4 ring-yellow-300 -translate-y-4 z-20' : ''}
            `}
      >
        {/* Topping Counter Badge */}
        <div className="bg-white text-black font-black rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-md z-10 border-2 border-amber-900">
          {potatoState.toppingCount}
        </div>

        <div className="text-3xl z-10 drop-shadow-md">🥔</div>

        <div className="text-[10px] font-bold bg-black/40 px-2 rounded text-white z-10 mb-1">
          {potatoState.isFrozen ? 'FROZEN' : 'HOT!'}
        </div>

        {/* Progress Bar Background */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/50">
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  // --- Regular Card Rendering ---
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        w-24 h-36 rounded-lg border-b-4 border-r-4 shadow-lg flex flex-col p-2
        transition-all duration-200 select-none relative
        ${getStyles()}
        ${disabled ? 'cursor-not-allowed brightness-75 grayscale' : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl'}
        ${selected ? 'ring-4 ring-white -translate-y-4 shadow-2xl z-20' : ''}
      `}
    >
      <div className="flex justify-between items-start">
        <div className="font-bold text-[10px] uppercase tracking-wider leading-none">{card.category}</div>
        <div className="text-sm">{getIcon()}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="font-black text-sm uppercase leading-tight mb-1">{card.name}</div>
        <div className="text-[9px] opacity-80 leading-tight">{card.description}</div>
      </div>

      <div className="absolute bottom-1 right-2 opacity-20 text-2xl pointer-events-none">
        {getIcon()}
      </div>
    </div>
  );
};
