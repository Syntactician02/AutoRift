import React, { useEffect } from 'react';

export default function PopupModal({ title, children, onClose, accentColor = '#00e5ff' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fade-in" style={{
        width: 360, background: '#111620',
        border: `1px solid ${accentColor}30`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e2a3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f4', letterSpacing: '0.05em' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d4d61', fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '14px 16px' }}>{children}</div>
      </div>
    </div>
  );
}