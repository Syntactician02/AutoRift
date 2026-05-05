import React, { useRef, useState, useEffect, useCallback } from 'react';

const TYPE_META = {
  click:    { sym: '↗', label: 'CLICK'  },
  input:    { sym: '✎', label: 'INPUT'  },
  navigate: { sym: '→', label: 'NAV'    },
  scroll:   { sym: '↕', label: 'SCROLL' },
  keydown:  { sym: '⌨', label: 'KEY'    },
};

export default function FloatOverlay({ isRecording, steps, status, onStop }) {
  const overlayRef = useRef(null);
  const dragging   = useRef(false);
  const origin     = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [pos, setPos] = useState({ right: 24, bottom: 24, left: null, top: null });

  // Only show when recording, or after recording with steps
  const visible = isRecording || (status !== 'idle' && steps.length > 0);
  const isIdle  = !isRecording;

  const lastStep = steps[steps.length - 1];
  const lastMeta = lastStep ? (TYPE_META[lastStep.type] || { sym: '·', label: lastStep.type }) : null;
  const lastLabel = lastStep
    ? `${lastMeta.sym} ${lastMeta.label}  ${
        lastStep.payload?.selector ||
        lastStep.payload?.value ||
        lastStep.payload?.key ||
        lastStep.payload?.url || ''
      }`.slice(0, 38)
    : '—';

  // Drag logic
  const onMouseDown = useCallback((e) => {
    if (e.target.tagName === 'BUTTON') return;
    dragging.current = true;
    const rect = overlayRef.current.getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    setPos({ left: rect.left, top: rect.top, right: null, bottom: null });
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - origin.current.x;
      const dy = e.clientY - origin.current.y;
      setPos({ left: origin.current.left + dx, top: origin.current.top + dy, right: null, bottom: null });
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!visible) return null;

  const borderColor  = isIdle ? 'rgba(0,229,255,.45)' : 'rgba(255,59,92,.5)';
  const accentColor  = isIdle ? '#00e5ff' : '#ff3b5c';
  const dotColor     = isIdle ? '#00e5ff' : '#ff3b5c';
  const statusText   = isIdle ? 'IDLE' : 'REC';

  const style = {
    position: 'fixed',
    zIndex: 9999,
    width: 220,
    borderRadius: 12,
    background: 'rgba(12,15,20,.92)',
    border: `1px solid ${borderColor}`,
    boxShadow: `0 0 0 1px ${accentColor}18, 0 8px 32px rgba(0,0,0,.6), 0 0 40px ${accentColor}22`,
    backdropFilter: 'blur(16px) saturate(1.4)',
    overflow: 'hidden',
    cursor: 'grab',
    userSelect: 'none',
    ...(pos.left != null
      ? { left: pos.left, top: pos.top }
      : { right: pos.right, bottom: pos.bottom }),
  };

  return (
    <div ref={overlayRef} style={style} onMouseDown={onMouseDown} data-autorift-ui>
      {/* Accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            animation: isIdle ? 'none' : 'pulse-rec 1.1s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: '#e8edf5', letterSpacing: '.04em' }}>
            AutoRift
          </span>
        </div>
        <span style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, color: dotColor }}>
          {statusText}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 12px 8px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: '#e8edf5', letterSpacing: -1, lineHeight: 1.1 }}>
          {String(steps.length).padStart(3, '0')}
        </div>
        <div style={{ fontSize: 8, letterSpacing: '.22em', textTransform: 'uppercase', color: '#3d4d61', marginBottom: 5 }}>
          steps captured
        </div>
        <div style={{ fontSize: 9, color: '#7a8aa0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#00e5ff' }}>{lastLabel.split('  ')[0]}</span>
          {'  ' + (lastLabel.split('  ')[1] || '')}
        </div>
      </div>

      {/* Stop button — only when actively recording */}
      {isRecording && (
        <button
          onClick={onStop}
          style={{
            display: 'flex', width: 'calc(100% - 24px)', margin: '0 12px 10px',
            padding: '7px 0', borderRadius: 6,
            background: 'rgba(255,59,92,.15)', border: '1px solid rgba(255,59,92,.4)',
            color: '#ff3b5c', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: '.18em', textTransform: 'uppercase', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'background .18s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,92,.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,59,92,.15)'}
        >
          ■ Stop Recording
        </button>
      )}
    </div>
  );
}