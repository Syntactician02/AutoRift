import React, { useRef, useEffect } from 'react';

const TYPE_STYLE = {
  click:    { color: '#00e5ff', symbol: '↗', label: 'CLICK' },
  input:    { color: '#00ff88', symbol: '✎', label: 'INPUT' },
  navigate: { color: '#ffcc00', symbol: '→', label: 'NAV'   },
  scroll:   { color: '#a78bfa', symbol: '↕', label: 'SCROLL'},
  keydown:  { color: '#f97316', symbol: '⌨', label: 'KEY'   },
};

function StepRow({ step, index, onRemove }) {
  const style = TYPE_STYLE[step.type] || { color: '#7a8aa0', symbol: '·', label: step.type.toUpperCase() };
  const time = new Date(step.timestamp).toLocaleTimeString('en-GB', { hour12: false });

  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-[#1c2130] hover:bg-[#1c2130] transition-colors duration-150 fade-in">
      {/* Index */}
      <span className="text-[9px] text-[#3d4d61] tabular-nums w-5 mt-0.5 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Type badge */}
      <span
        className="text-[9px] font-bold tracking-widest mt-0.5 shrink-0 w-12"
        style={{ color: style.color }}
      >
        {style.symbol} {style.label}
      </span>

      {/* Payload */}
      <div className="flex-1 min-w-0">
        <StepPayload type={step.type} payload={step.payload} color={style.color} />
        <span className="text-[9px] text-[#3d4d61] mt-0.5 block">{time}</span>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(step.id)}
        className="opacity-0 group-hover:opacity-100 text-[#3d4d61] hover:text-[#ff3b5c] text-xs transition-all duration-150 shrink-0 mt-0.5"
        title="Remove step"
      >
        ✕
      </button>
    </div>
  );
}

function StepPayload({ type, payload, color }) {
  if (type === 'click') {
    return (
      <div className="text-[11px] text-[#7a8aa0] truncate">
        <span className="font-mono" style={{ color }}>{payload.selector}</span>
        {payload.text && <span className="text-[#3d4d61]"> · "{payload.text}"</span>}
      </div>
    );
  }
  if (type === 'input') {
    return (
      <div className="text-[11px] text-[#7a8aa0] truncate">
        <span className="font-mono" style={{ color }}>{payload.selector}</span>
        <span className="text-[#3d4d61]"> → "{payload.value}"</span>
      </div>
    );
  }
  if (type === 'navigate') {
    return (
      <div className="text-[11px] font-mono truncate" style={{ color }}>
        {payload.url}
      </div>
    );
  }
  if (type === 'keydown') {
    return (
      <div className="text-[11px] font-mono" style={{ color }}>
        [{payload.key}]
      </div>
    );
  }
  return (
    <div className="text-[11px] text-[#3d4d61] truncate font-mono">
      {JSON.stringify(payload)}
    </div>
  );
}

export default function StepViewer({ steps, onRemove }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps.length]);

  if (!steps.length) {
    return (
      <div className="rounded-lg border border-[#252d3d] bg-[#161a22] flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
        <div className="text-3xl opacity-10">⬡</div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#3d4d61]">
          No steps recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#252d3d] bg-[#161a22] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252d3d] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a8aa0] font-display">
            Step Log
          </span>
        </div>
        <span className="text-[10px] text-[#3d4d61] font-mono">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Steps list */}
      <div className="overflow-y-auto flex-1 max-h-[400px]">
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} onRemove={onRemove} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}