import React from 'react';

export default function ControlPanel({
  steps,
  status,
  onSubmit,
  onExecute,
  onClear,
}) {
  const isLoading = status === 'submitting' || status === 'executing';
  const hasSteps = steps.length > 0;

  const btnBase =
    'flex-1 py-2.5 px-4 rounded-md text-[11px] font-semibold tracking-[0.12em] uppercase transition-all duration-200 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="rounded-lg border border-[#252d3d] bg-[#161a22] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ffcc00]" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a8aa0] font-display">
          Control Panel
        </span>
      </div>

      <div className="flex gap-3">
        {/* Submit to backend */}
        <button
          className={`${btnBase} bg-[#1c2130] border border-[#2e3a50] text-[#00e5ff]
            hover:border-[#00e5ff] hover:bg-[#00e5ff10]`}
          onClick={onSubmit}
          disabled={!hasSteps || isLoading}
          title="Send steps to FastAPI backend"
        >
          {status === 'submitting' ? '⟳ Sending...' : '↑ Submit'}
        </button>

        {/* Execute */}
        <button
          className={`${btnBase} bg-[#00e5ff] text-[#0a0b0d]
            hover:bg-white shadow-[0_0_15px_rgba(0,229,255,0.15)]
            hover:shadow-[0_0_25px_rgba(0,229,255,0.4)]`}
          onClick={onExecute}
          disabled={!hasSteps || isLoading}
          title="Run workflow via Playwright"
        >
          {status === 'executing' ? '⟳ Running...' : '▶ Execute'}
        </button>
      </div>

      {/* Clear */}
      <button
        className={`${btnBase} w-full border border-[#252d3d] text-[#7a8aa0]
          hover:border-[#ff3b5c] hover:text-[#ff3b5c] hover:bg-[#ff3b5c08]`}
        onClick={onClear}
        disabled={isLoading}
      >
        ✕ Clear All Steps
      </button>

      {/* Step summary chips */}
      {hasSteps && (
        <div className="pt-1 border-t border-[#252d3d] flex flex-wrap gap-2">
          {summarizeSteps(steps).map(({ type, count }) => (
            <span
              key={type}
              className="px-2 py-0.5 rounded-full border border-[#252d3d] text-[9px] tracking-widest uppercase text-[#7a8aa0]"
            >
              {count}× {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeSteps(steps) {
  const map = {};
  steps.forEach(({ type }) => {
    map[type] = (map[type] || 0) + 1;
  });
  return Object.entries(map).map(([type, count]) => ({ type, count }));
}