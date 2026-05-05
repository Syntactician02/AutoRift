import React, { useRef, useEffect } from 'react';

const TYPE_STYLE = {
  click:    { color: '#00e5ff', symbol: '↗', label: 'CLICK' },
  input:    { color: '#00ff88', symbol: '✎', label: 'INPUT' },
  navigate: { color: '#ffcc00', symbol: '→', label: 'NAV'   },
  scroll:   { color: '#a78bfa', symbol: '↕', label: 'SCROLL'},
  keydown:  { color: '#f97316', symbol: '⌨', label: 'KEY'   },
};

export default function StepViewer({ steps, onRemove }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [steps.length]);

  if (!steps.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
      <span style={{ fontSize: 24, opacity: 0.1 }}>≡</span>
      <p style={{ fontSize: 9, color: '#3d4d61', letterSpacing: '0.2em', textTransform: 'uppercase' }}>No steps recorded yet</p>
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', maxHeight: 340, display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, i) => {
        const s = TYPE_STYLE[step.type] || { color: '#7a8aa0', symbol: '·', label: step.type.toUpperCase() };
        const time = new Date(step.timestamp).toLocaleTimeString('en-GB', { hour12: false });
        return (
          <div key={step.id} className="fade-in" style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '7px 10px', borderBottom: '1px solid #111620',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#111620'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: '#3d4d61', fontSize: 9, minWidth: 16, marginTop: 2 }}>{String(i+1).padStart(2,'0')}</span>
            <span style={{ color: s.color, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', minWidth: 42, marginTop: 2 }}>{s.symbol} {s.label}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#7a8aa0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.type === 'click' && <><span style={{ color: s.color }}>{step.payload.selector}</span>{step.payload.text && <span style={{ color: '#3d4d61' }}> · "{step.payload.text}"</span>}</>}
                {step.type === 'input' && <><span style={{ color: s.color }}>{step.payload.selector}</span><span style={{ color: '#3d4d61' }}> → "{step.payload.value}"</span></>}
                {step.type === 'navigate' && <span style={{ color: s.color }}>{step.payload.url}</span>}
                {step.type === 'keydown' && <span style={{ color: s.color }}>[{step.payload.key}]</span>}
                {!['click','input','navigate','keydown'].includes(step.type) && <span>{JSON.stringify(step.payload)}</span>}
              </div>
              <span style={{ fontSize: 8, color: '#3d4d61', marginTop: 2, display: 'block' }}>{time}</span>
            </div>
            <button onClick={() => onRemove(step.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3d4d61', fontSize: 10, padding: '0 2px',
              opacity: 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ff3b5c'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = '#3d4d61'; }}
            >✕</button>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}