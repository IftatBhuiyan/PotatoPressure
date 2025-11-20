
import React from 'react';
import { PotatoState } from '../types';
import { EXPLOSION_BASE } from '../constants';

interface PotatoProps {
  potato: PotatoState;
  ownerName: string;
  playerCount: number;
  onClick?: () => void;
  highlight?: boolean;
}

export const Potato: React.FC<PotatoProps> = ({ potato, ownerName, playerCount, onClick, highlight }) => {
  const limit = EXPLOSION_BASE + playerCount;
  const ratio = potato.toppingCount / limit;
  
  // Dynamic styling based on danger level
  let bgClass = "bg-amber-600";
  let animateClass = "";
  
  if (ratio >= 0.5) bgClass = "bg-orange-600";
  if (ratio >= 0.8) {
      bgClass = "bg-red-600";
      animateClass = "animate-pulse";
  }

  return (
    <div 
        onClick={onClick}
        className={`
            relative w-20 h-24 flex flex-col items-center justify-between py-2
            rounded-xl shadow-lg border-4 border-amber-900
            text-white transition-all duration-300
            ${bgClass} ${animateClass}
            ${highlight ? 'ring-4 ring-yellow-400 scale-110 cursor-pointer z-10' : ''}
            ${potato.isFrozen ? 'ring-4 ring-cyan-400' : ''}
        `}
    >
       {/* Toppings Count */}
       <div className="bg-white text-black font-bold rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-inner border border-gray-300 z-10">
           {potato.toppingCount}
       </div>
       
       <div className="text-4xl drop-shadow-md">🥔</div>
       
       {/* Owner Tag */}
       <div className="bg-black/60 px-2 py-0.5 rounded text-[10px] whitespace-nowrap max-w-[110%] truncate">
           {ownerName}
       </div>
       
       {potato.isFrozen && (
           <div className="absolute -top-2 -right-2 text-xl">❄️</div>
       )}
       
       {/* Danger Bar */}
       <div className="absolute bottom-0 left-0 w-full h-1 bg-black/30">
           <div 
             className="h-full bg-red-500 transition-all duration-500" 
             style={{ width: `${Math.min(ratio * 100, 100)}%` }}
           />
       </div>
    </div>
  );
};
