import React, { useState, useEffect } from 'react';
import { Church, RotateCcw } from 'lucide-react';

const LoadingScreen = ({ label = 'Fe\'aa jira... (Loading...)' }) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 select-none"
    >
      <div className="flex flex-col items-center space-y-4 max-w-sm text-center animate-in fade-in duration-300">
        {/* Church Icon with Bouncing Animation */}
        <div className="w-16 h-16 rounded-3xl bg-royal-tint border-2 border-gold-400 flex items-center justify-center shadow-lg">
          <Church className="w-9 h-9 text-gold-500 animate-bounce" />
        </div>

        {/* Dynamic Label */}
        <div className="space-y-1">
          <p className="text-sm font-black text-royal tracking-wide">
            {label}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
          </p>
        </div>

        {/* Slow Network / Timeout Notice (Triggers after 6 seconds) */}
        {isSlow && (
          <div className="pt-4 space-y-3 animate-in fade-in duration-300">
            <p className="text-xs text-royal font-medium bg-royal-tint px-4 py-2 rounded-xl border border-gold-400/50">
              The server is taking longer than usual.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-black text-royal bg-gold-500 hover:bg-gold-600 active:scale-95 rounded-xl transition-all shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5 text-royal" />
              <span>Irra Deebi'i (Retry)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
