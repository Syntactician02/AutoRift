import React, { useState, useEffect, useRef } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import RecorderPanel from '../components/RecorderPanel';
import ControlPanel from '../components/ControlPanel';
import StepViewer from '../components/StepViewer';
import PopupModal from '../components/PopupModal';
import ErrorBox from '../components/ErrorBox';
import FloatOverlay from '../components/FloatOverlay';
import TaskPanel from '../components/TaskPanel';

export default function IndexPage() {
  const {
    isRecording, steps, status, error, executionLog,
    startRecording, stopRecording, clearSteps, removeStep,
    submitToBackend, runExecution, exportJSON,
  } = useRecorder();

  const [showExecModal, setShowExecModal]     = useState(false);
  const [dismissedError, setDismissedError]   = useState(false);
  const [shortcutToast, setShortcutToast]     = useState(null);

  const visibleError = !dismissedError && error ? error : null;

  const handleExecute = async () => {
    setShowExecModal(false);
    await runExecution();
    setShowExecModal(true);
  };

  // Listen for shortcut-triggered task from main process
  useEffect(() => {
    window.electronAPI?.onShortcutTriggered?.((data) => {
      setShortcutToast(`▶ Running: "${data.task}" via ${data.shortcut}`);
      setTimeout(() => setShortcutToast(null), 4000);
    });
    return () => window.electronAPI?.removeAllListeners?.('task:shortcut-triggered');
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-[#e8edf5] font-mono" data-autorift-ui>
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Shortcut toast notification */}
      {shortcutToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0d1f2d] border border-[#00e5ff] text-[#00e5ff] 
          text-[11px] tracking-widest px-4 py-3 rounded-md shadow-lg fade-in">
          {shortcutToast}
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Top bar */}
        <header className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#00e5ff" strokeWidth="1.5" fill="none" />
                <polygon points="14,7 21,11 21,18 14,22 7,18 7,11" fill="#00e5ff" fillOpacity="0.15" stroke="#00e5ff" strokeWidth="1" />
                <circle cx="14" cy="14" r="3" fill="#00e5ff" />
              </svg>
              <h1 className="font-display text-2xl font-bold tracking-tight shimmer-text">
                AutoRift
              </h1>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#3d4d61]">
              Workflow Automation · Capture → Execute → Adapt
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-[#3d4d61] uppercase">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-[#ff3b5c] pulse-rec' : 'bg-[#3d4d61]'}`} />
            {isRecording ? 'Live' : 'Standby'}
          </div>
        </header>

        <ErrorBox error={visibleError} onDismiss={() => setDismissedError(true)} />

        {/* ✅ Task Panel — submit AI tasks + view saved tasks */}
        <TaskPanel />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="flex flex-col gap-5">
            <RecorderPanel
              isRecording={isRecording}
              status={status}
              steps={steps}
              onStart={() => { setDismissedError(false); startRecording(); }}
              onStop={stopRecording}
            />
            <ControlPanel
              steps={steps}
              status={status}
              onSubmit={submitToBackend}
              onExecute={handleExecute}
              onClear={clearSteps}
              onExport={exportJSON}
            />
          </div>

          <div className="lg:col-span-2">
            <StepViewer steps={steps} onRemove={removeStep} />
          </div>
        </div>

        <footer className="flex items-center justify-between pt-4 border-t border-[#1c2130]">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#3d4d61]">
            AutoRift v0.2 · Web Edition
          </span>
          <div className="flex gap-4 text-[9px] tracking-widest text-[#3d4d61] uppercase">
            <span>React</span><span>·</span>
            <span>FastAPI</span><span>·</span>
            <span>Playwright</span>
          </div>
        </footer>
      </div>

      {/* Execution modal */}
      {showExecModal && (
        <PopupModal
          title="Execution Results"
          onClose={() => setShowExecModal(false)}
          accentColor={error ? '#ff3b5c' : '#00ff88'}
        >
          <div className="flex flex-col gap-3">
            {executionLog.length > 0 ? (
              <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
                {executionLog.map((line, i) => (
                  <div key={i} className="flex items-start gap-2 fade-in">
                    <span className="text-[9px] text-[#3d4d61] tabular-nums shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-mono text-[#e8edf5]">{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#7a8aa0]">
                {error ? error : 'No execution log returned.'}
              </p>
            )}
            <button
              onClick={() => setShowExecModal(false)}
              className="mt-2 w-full py-2.5 rounded-md border border-[#252d3d] text-[11px] tracking-widest uppercase text-[#7a8aa0]
                hover:border-[#00e5ff] hover:text-[#00e5ff] transition-all duration-200"
            >
              Close
            </button>
          </div>
        </PopupModal>
      )}

      <FloatOverlay
        isRecording={isRecording}
        steps={steps}
        status={status}
        onStop={stopRecording}
      />
    </div>
  );
}