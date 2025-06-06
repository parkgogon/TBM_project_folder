
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700/50 text-center py-6">
      <p className="text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Global TBM Assistant. For demonstration purposes.
      </p>
      <p className="text-xs text-slate-500 mt-1">
        AI-powered translation for safer construction sites.
      </p>
    </footer>
  );
};
