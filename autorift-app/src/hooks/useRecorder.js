import { useState, useCallback, useRef, useEffect } from 'react';

const ACTION_TYPES = {
  CLICK: 'click',
  INPUT: 'input',
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  KEYDOWN: 'keydown',
};

let stepCounter = 0;

function buildStep(type, payload) {
  stepCounter++;
  return {
    id: `step_${stepCounter}_${Date.now()}`,
    type,
    timestamp: new Date().toISOString(),
    payload,
  };
}

export function useRecorder() {
  const [isRecording, setIsRecording]     = useState(false);
  const [steps, setSteps]                 = useState([]);
  const [status, setStatus]               = useState('idle');
  const [error, setError]                 = useState(null);
  const [executionLog, setExecutionLog]   = useState([]);
  const [taskId, setTaskId]               = useState(null);
  const listenersRef                      = useRef([]);
  const pollRef                           = useRef(null);

  // ── Global steps from Electron (cross-app recording) ──────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onGlobalStep) return;
    window.electronAPI.onGlobalStep((step) => {
      setSteps((prev) => [...prev, step]);
    });
    return () => window.electronAPI.removeAllListeners('global:step');
  }, []);

  // ── DOM listener helpers ───────────────────────────────────────────────────
  const addStep = useCallback((step) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  // ── Start Recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    setError(null);
    setExecutionLog([]);
    setStatus('recording');
    setIsRecording(true);
    setSteps([]);
    stepCounter = 0;

    window.electronAPI?.recordingStarted();

    const onClick = (e) => {
      const el = e.target;
      // ignore clicks inside the AutoRift UI itself
      if (el.closest('[data-autorift-ui]')) return;
      const selector = buildSelector(el);
      addStep(buildStep(ACTION_TYPES.CLICK, {
        selector,
        tag: el.tagName.toLowerCase(),
        text: el.innerText?.slice(0, 80) || '',
        x: e.clientX,
        y: e.clientY,
      }));
    };

    const inputTimers = new WeakMap();
    const onInput = (e) => {
      const el = e.target;
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      clearTimeout(inputTimers.get(el));
      inputTimers.set(el, setTimeout(() => {
        addStep(buildStep(ACTION_TYPES.INPUT, {
          selector: buildSelector(el),
          value: el.value,
          inputType: el.type || 'text',
        }));
      }, 600));
    };

    const onKeydown = (e) => {
      if (['Enter', 'Escape', 'Tab'].includes(e.key)) {
        addStep(buildStep(ACTION_TYPES.KEYDOWN, { key: e.key }));
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('keydown', onKeydown, true);

    listenersRef.current = [
      () => document.removeEventListener('click', onClick, true),
      () => document.removeEventListener('input', onInput, true),
      () => document.removeEventListener('keydown', onKeydown, true),
    ];
  }, [addStep]);

  // ── Stop Recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    listenersRef.current.forEach((remove) => remove());
    listenersRef.current = [];
    setIsRecording(false);
    setStatus('idle');
    window.electronAPI?.recordingStopped();
  }, []);

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearSteps = useCallback(() => {
    setSteps([]);
    setError(null);
    setExecutionLog([]);
    setStatus('idle');
    setTaskId(null);
    stepCounter = 0;
    clearInterval(pollRef.current);
  }, []);

  const removeStep = useCallback((id) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Export JSON ────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(steps, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autorift-steps-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [steps]);

  // ── Poll backend logs ──────────────────────────────────────────────────────
  function startPolling(id) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/status');
        const data = await res.json();
        if (data.logs?.length) {
          setExecutionLog(data.logs.slice(-50));
        }
        if (!data.is_running) {
          clearInterval(pollRef.current);
          setStatus('done');
        }
      } catch (e) {
        clearInterval(pollRef.current);
      }
    }, 2000);
  }

  // ── Submit to Backend — stores steps + task in tasks_log.json ─────────────
  const submitToBackend = useCallback(async (shortcutKey = null) => {
    if (!steps.length) {
      setError('No steps recorded. Record something first.');
      return;
    }
    setStatus('submitting');
    setError(null);

    // Convert recorded steps into a task description
    const taskDescription = steps
      .map((s, i) => {
        if (s.type === 'click')    return `Click on ${s.payload.text || s.payload.selector}`;
        if (s.type === 'input')    return `Type "${s.payload.value}" into ${s.payload.selector}`;
        if (s.type === 'keydown')  return `Press ${s.payload.key}`;
        if (s.type === 'navigate') return `Navigate to ${s.payload.url}`;
        return `Step ${i + 1}: ${s.type}`;
      })
      .join(', then ');

    try {
      const res = await fetch('http://localhost:8000/start-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskDescription,
          shortcut_key: shortcutKey || null,
          recorded_steps: steps,
        }),
      });

      const data = await res.json();

      if (data.status === 'started') {
        setTaskId(data.task_id);
        setExecutionLog([`✅ Task stored with ID: ${data.task_id}`, `📋 ${data.steps_planned} steps planned`]);
        setStatus('submitted');
      } else {
        setError(data.message || 'Submission failed');
        setStatus('error');
      }
    } catch (err) {
      setError('Backend unreachable. Is it running on port 8000?');
      setStatus('error');
    }
  }, [steps]);

  // ── Run Execution — executes stored task via backend ──────────────────────
  const runExecution = useCallback(async (shortcutKey = null) => {
    if (!steps.length) {
      setError('No steps to execute.');
      return;
    }
    setStatus('executing');
    setError(null);
    setExecutionLog([]);

    const taskDescription = steps
      .map((s, i) => {
        if (s.type === 'click')    return `Click on ${s.payload.text || s.payload.selector}`;
        if (s.type === 'input')    return `Type "${s.payload.value}" into ${s.payload.selector}`;
        if (s.type === 'keydown')  return `Press ${s.payload.key}`;
        if (s.type === 'navigate') return `Navigate to ${s.payload.url}`;
        return `Step ${i + 1}: ${s.type}`;
      })
      .join(', then ');

    try {
      const res = await fetch('http://localhost:8000/start-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskDescription,
          shortcut_key: shortcutKey || null,
          recorded_steps: steps,
        }),
      });

      const data = await res.json();

      if (data.status === 'started') {
        setTaskId(data.task_id);
        setExecutionLog([`▶ Executing task: ${data.task_id}`, `📋 ${data.steps_planned} steps`]);
        startPolling(data.task_id);
      } else {
        setError(data.message || 'Execution failed');
        setStatus('error');
      }
    } catch (err) {
      setError('Backend unreachable. Is it running on port 8000?');
      setStatus('error');
    }
  }, [steps]);

  return {
    isRecording,
    steps,
    status,
    error,
    executionLog,
    taskId,
    startRecording,
    stopRecording,
    clearSteps,
    removeStep,
    submitToBackend,
    runExecution,
    exportJSON,
  };
}

// ── Utility: build a best-effort CSS selector ──────────────────────────────────
function buildSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.dataset?.testid) return `[data-testid="${el.dataset.testid}"]`;
  const tag = el.tagName.toLowerCase();
  const cls = Array.from(el.classList)
    .filter((c) => !c.match(/^(hover|focus|active|css-)/))
    .slice(0, 2)
    .join('.');
  if (cls) return `${tag}.${cls}`;
  const parent = el.parentElement;
  if (parent) {
    const idx = Array.from(parent.children).indexOf(el) + 1;
    return `${tag}:nth-child(${idx})`;
  }
  return tag;
}