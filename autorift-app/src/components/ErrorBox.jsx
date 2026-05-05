import React from 'react';

export default function ErrorBox({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="fade-in rounded-lg border border-[#ff3b5c40] bg-[#ff3b5c08] px-4 py-3 flex items-start gap-3">
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full border border-[#ff3b5c] flex items-center justify-center">
          <span className="text-[#ff3b5c] text-[9px] font-bold">!</span>
        </div>
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] tracking-[0.15em] uppercase text-[#ff3b5c] font-semibold mb-0.5">
          Execution Error
        </p>
        <p className="text-[11px] text-[#e8edf5] font-mono break-words">{error}</p>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-[#ff3b5c] hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}