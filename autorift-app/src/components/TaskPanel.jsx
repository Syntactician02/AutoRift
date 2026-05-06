import React, { useState, useEffect, useRef } from 'react';

export default function TaskPanel() {
  const [task, setTask]               = useState('');
  const [shortcutKey, setShortcutKey] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [savedTasks, setSavedTasks]   = useState({});
  const [statusLogs, setStatusLogs]   = useState([]);
  const [isPolling, setIsPolling]     = useState(false);
  const [feedback, setFeedback]       = useState(null);
  const [collapsed, setCollapsed]     = useState(false);
  const pollRef                       = useRef(null);
  const logsEndRef                    = useRef(null);

  // Load saved tasks on mount
  useEffect(() => {
    loadSavedTasks();
  }, []);

  // Auto scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  async function loadSavedTasks() {
    try {
      const tasks = await window.electronAPI.getAllTasks();
      setSavedTasks(tasks || {});
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  }

  async function handleSubmit() {
    if (!task.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    setStatusLogs([]);

    try {
      const result = await window.electronAPI.submitTask(task.trim(), shortcutKey.trim() || null);

      if (result.status === 'started') {
        setFeedback({
          type: 'success',
          msg: `✅ Task started — ${result.steps_planned} steps planned${shortcutKey ? ` · Shortcut: ${shortcutKey}` : ''}`
        });
        setTask('');
        setShortcutKey('');
        loadSavedTasks();
        startPolling();
      } else {
        setFeedback({ type: 'error', msg: `❌ ${result.message || 'Failed to start task'}` });
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: `❌ Backend unreachable. Is it running?` });
    }

    setSubmitting(false);
  }

  function startPolling() {
    setIsPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await window.electronAPI.getTaskStatus();
        if (status.logs?.length) {
          setStatusLogs(status.logs.slice(-30));
        }
        if (!status.is_running) {
          stopPolling();
        }
      } catch (e) {
        stopPolling();
      }
    }, 2000);
  }

  function stopPolling() {
    setIsPolling(false);
    clearInterval(pollRef.current);
    loadSavedTasks();
  }

  async function handleRunAgain(shortcut) {
    setFeedback(null);
    setStatusLogs([]);
    try {
      const res = await fetch('http://localhost:8000/run-by-shortcut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut_key: shortcut })
      });
      const data = await res.json();
      if (data.status === 'started') {
        setFeedback({ type: 'success', msg: `▶ Re-running: "${data.task}"` });
        startPolling();
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: '❌ Could not re-run task' });
    }
  }

  async function handlePause() {
    await window.electronAPI.pauseTask();
    setFeedback({ type: 'info', msg: '⏸ Task paused' });
  }

  async function handleResume() {
    await window.electronAPI.resumeTask();
    setFeedback({ type: 'info', msg: '▶ Task resumed' });
  }

  const taskEntries = Object.entries(savedTasks);

  return (
    <div className="rounded-xl border border-[#1c2130] bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#1c2130] cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#00e5ff] text-[11px]">⚡</span>
          <span className="text-[11px] tracking-widest uppercase text-[#7a8aa0]">AI Task Runner</span>
          {isPolling && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          )}
        </div>
        <span className="text-[#3d4d61] text-[10px]">{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div className="p-4 flex flex-col gap-4">

          {/* Task input */}
          <div className="flex flex-col gap-2">
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Describe your task... e.g. install node, create a react app, run it"
              rows={3}
              className="w-full bg-[#0a0b0d] border border-[#1c2130] rounded-md px-3 py-2 text-[11px] 
                text-[#e8edf5] placeholder-[#3d4d61] font-mono resize-none
                focus:outline-none focus:border-[#00e5ff] transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
              }}
            />
            <input
              value={shortcutKey}
              onChange={e => setShortcutKey(e.target.value)}
              placeholder="Assign shortcut key (e.g. ctrl+shift+t) — optional"
              className="w-full bg-[#0a0b0d] border border-[#1c2130] rounded-md px-3 py-2 
                text-[11px] text-[#e8edf5] placeholder-[#3d4d61] font-mono
                focus:outline-none focus:border-[#00e5ff] transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !task.trim()}
              className="flex-1 py-2 rounded-md border border-[#00e5ff] text-[#00e5ff] text-[11px] 
                tracking-widest uppercase font-mono
                hover:bg-[#00e5ff] hover:text-[#0a0b0d] transition-all duration-200
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'Planning...' : '▶ Start Task'}
            </button>
            {isPolling && (
              <>
                <button
                  onClick={handlePause}
                  className="px-3 py-2 rounded-md border border-[#ff9800] text-[#ff9800] 
                    text-[11px] tracking-widest uppercase
                    hover:bg-[#ff9800] hover:text-[#0a0b0d] transition-all duration-200"
                >
                  ⏸
                </button>
                <button
                  onClick={handleResume}
                  className="px-3 py-2 rounded-md border border-[#00ff88] text-[#00ff88] 
                    text-[11px] tracking-widest uppercase
                    hover:bg-[#00ff88] hover:text-[#0a0b0d] transition-all duration-200"
                >
                  ▶
                </button>
              </>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-[11px] font-mono px-3 py-2 rounded-md border fade-in ${
              feedback.type === 'success' ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff8810]' :
              feedback.type === 'error'   ? 'border-[#ff3b5c] text-[#ff3b5c] bg-[#ff3b5c10]' :
                                            'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff10]'
            }`}>
              {feedback.msg}
            </div>
          )}

          {/* Live logs */}
          {statusLogs.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] tracking-widest uppercase text-[#3d4d61]">Live Logs</span>
              <div className="bg-[#0a0b0d] border border-[#1c2130] rounded-md p-2 max-h-40 overflow-y-auto">
                {statusLogs.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono text-[#7a8aa0] leading-5">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Saved tasks */}
          {taskEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[9px] tracking-widest uppercase text-[#3d4d61]">
                Saved Tasks ({taskEntries.length})
              </span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {taskEntries.map(([id, data]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 bg-[#0a0b0d] 
                      border border-[#1c2130] rounded-md px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] text-[#e8edf5] truncate">{data.task}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] tracking-widest uppercase ${
                          data.status === 'completed' ? 'text-[#00ff88]' :
                          data.status === 'running'   ? 'text-[#00e5ff]' :
                          data.status === 'error'     ? 'text-[#ff3b5c]' :
                                                        'text-[#3d4d61]'
                        }`}>
                          {data.status}
                        </span>
                        {data.shortcut_key && (
                          <span className="text-[9px] text-[#3d4d61] border border-[#1c2130] 
                            rounded px-1 font-mono">
                            {data.shortcut_key}
                          </span>
                        )}
                      </div>
                    </div>
                    {data.shortcut_key && (
                      <button
                        onClick={() => handleRunAgain(data.shortcut_key)}
                        className="shrink-0 px-2 py-1 rounded border border-[#1c2130] 
                          text-[9px] tracking-widest uppercase text-[#7a8aa0]
                          hover:border-[#00e5ff] hover:text-[#00e5ff] transition-all duration-200"
                      >
                        ▶ Run
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] text-[#3d4d61] font-mono">
            Ctrl+Enter to submit · Shortcuts work globally even when app is minimized
          </p>
        </div>
      )}
    </div>
  );
}