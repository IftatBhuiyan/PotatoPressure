import React from 'react';
import { GameProvider } from './state/store';
import { GameBoard } from './components/GameBoard';

const App: React.FC = () => {
  return (
    <GameProvider>
      <div className="w-full h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
        <GameBoard />
      </div>
    </GameProvider>
  );
};

export default App;