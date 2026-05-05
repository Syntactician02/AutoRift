import { useState, useCallback, useRef, useEffect } from 'react';
import { submitSteps, executeSteps } from '../services/api';

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
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const listenersRef = useRef([]);

  // ── Global steps from Electron (cross-app recording) ──────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onGlobalStep) return;
    window.electronAPI.onGlobalStep((step) => {
      setSteps((prev) => [...prev, step]);
    });
    return () => window.electronAPI.removeAllListeners('global:step');
  }, []);

  // ── DOM listener helpers (in-app recording) ────────────────────────────────
  const addStep = useCallback((step) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    setExecutionLog([]);
    setStatus('recording');
    setIsRecording(true);

    // Notify Electron main process
    window.electronAPI?.recordingStarted();

    // Click listener
    const onClick = (e) => {
      const el = e.target;
      const selector = buildSelector(el);
      addStep(buildStep(ACTION_TYPES.CLICK, {
        selector,
        tag: el.tagName.toLowerCase(),
        text: el.innerText?.slice(0, 80) || '',
        x: e.clientX,
        y: e.clientY,
      }));
    };

    // Input listener (debounced per element)
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

    // Keydown (capture Enter, Escape, Tab)
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

  const stopRecording = useCallback(() => {
    listenersRef.current.forEach((remove) => remove());
    listenersRef.current = [];
    setIsRecording(false);
    setStatus('idle');

    // Notify Electron main process
    window.electronAPI?.recordingStopped();
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
    setError(null);
    setExecutionLog([]);
    setStatus('idle');
    stepCounter = 0;
  }, []);

  const removeStep = useCallback((id) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const submitToBackend = useCallback(async () => {
    if (!steps.length) return;
    setStatus('submitting');
    setError(null);
    try {
      const res = await submitSteps(steps);
      setExecutionLog((prev) => [...prev, `✓ Submitted ${steps.length} steps. Session: ${res.session_id || 'N/A'}`]);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Submission failed');
      setStatus('error');
    }
  }, [steps]);

  const runExecution = useCallback(async () => {
    if (!steps.length) return;
    setStatus('executing');
    setError(null);
    setExecutionLog([]);
    try {
      const res = await executeSteps(steps);
      const logs = res.results || [];
      setExecutionLog(logs.map((r) => `[${r.step}] ${r.status} — ${r.message || ''}`));
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Execution failed');
      setStatus('error');
    }
  }, [steps]);

  return {
    isRecording,
    steps,
    status,
    error,
    executionLog,
    startRecording,
    stopRecording,
    clearSteps,
    removeStep,
    submitToBackend,
    runExecution,
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