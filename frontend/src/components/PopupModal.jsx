import React, { useEffect } from 'react';

export default function PopupModal({ title, children, onClose, accentColor = '#00e5ff' }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border bg-[#161a22] shadow-2xl fade-in overflow-hidden"
        style={{ borderColor: accentColor + '40' }}
      >
        {/* Top accent bar */}
        <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252d3d]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
            <h2 className="font-display text-sm font-semibold tracking-wide text-[#e8edf5]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#3d4d61] hover:text-[#e8edf5] transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}