import React from 'react';

const STATUS_COLORS = {
  idle: 'text-[#7a8aa0]',
  recording: 'text-[#00ff88]',
  submitting: 'text-[#ffcc00]',
  executing: 'text-[#00e5ff]',
  done: 'text-[#00ff88]',
  error: 'text-[#ff3b5c]',
};

const STATUS_LABELS = {
  idle: 'STANDBY',
  recording: 'RECORDING',
  submitting: 'SUBMITTING...',
  executing: 'EXECUTING...',
  done: 'COMPLETE',
  error: 'ERROR',
};

export default function RecorderPanel({ isRecording, status, steps, onStart, onStop }) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.idle;
  const statusLabel = STATUS_LABELS[status] || 'UNKNOWN';

  return (
    <div className="relative scanline rounded-lg overflow-hidden border border-[#252d3d] bg-[#161a22] p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00e5ff] glow-cyan" />
          <span className="font-display text-xs tracking-[0.2em] uppercase text-[#7a8aa0]">
            AutoRift Recorder
          </span>
        </div>
        <span className={`font-mono text-[10px] tracking-[0.25em] font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Big rec indicator */}
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="relative">
          {/* Outer ring */}
          <div
            className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              isRecording
                ? 'border-[#ff3b5c] shadow-[0_0_30px_rgba(255,59,92,0.3)]'
                : 'border-[#252d3d]'
            }`}
          >
            {/* Inner dot */}
            <div
              className={`rounded-full transition-all duration-300 ${
                isRecording
                  ? 'w-10 h-10 bg-[#ff3b5c] pulse-rec shadow-[0_0_20px_rgba(255,59,92,0.8)]'
                  : 'w-6 h-6 bg-[#252d3d]'
              }`}
            />
          </div>
          {/* Orbit ring when recording */}
          {isRecording && (
            <div className="absolute inset-0 rounded-full border border-[#ff3b5c] opacity-30 scale-110 animate-ping" />
          )}
        </div>

        {/* Step counter */}
        <div className="text-center">
          <div className="font-display text-5xl font-bold text-[#e8edf5] tabular-nums">
            {String(steps.length).padStart(3, '0')}
          </div>
          <div className="text-[10px] tracking-[0.3em] text-[#3d4d61] mt-1 uppercase">
            steps captured
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={onStart}
            className="flex-1 py-3 rounded-md bg-[#00e5ff] text-[#0a0b0d] text-xs font-bold tracking-[0.15em] uppercase
              hover:bg-white transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.2)]
              hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] active:scale-[0.98]"
          >
            ▶ Start Recording
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-3 rounded-md bg-[#ff3b5c] text-white text-xs font-bold tracking-[0.15em] uppercase
              hover:bg-[#ff6080] transition-all duration-200 shadow-[0_0_20px_rgba(255,59,92,0.2)]
              hover:shadow-[0_0_30px_rgba(255,59,92,0.5)] active:scale-[0.98]"
          >
            ■ Stop Recording
          </button>
        )}
      </div>

      {/* Live tip */}
      {isRecording && (
        <p className="text-[10px] text-[#3d4d61] text-center tracking-wide fade-in">
          Listening for clicks · inputs · keypresses
        </p>
      )}
    </div>
  );
}