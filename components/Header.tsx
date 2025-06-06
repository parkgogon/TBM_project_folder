
import React from 'react';
import { ShieldCheckIcon } from './Icons'; // Example Icon

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-10 w-10 text-sky-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
            글로벌 TBM 어시스턴트
          </h1>
        </div>
        <span className="text-xs text-sky-400 font-mono hidden sm:block">v1.0 - Alpha</span>
      </div>
    </header>
  );
};