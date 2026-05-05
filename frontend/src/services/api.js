const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail || body.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Submit recorded steps to the backend for storage / validation.
 * POST /steps
 */
export async function submitSteps(steps) {
  return request('/steps', {
    method: 'POST',
    body: JSON.stringify({ steps }),
  });
}

/**
 * Trigger Playwright execution of the given steps.
 * POST /execute
 */
export async function executeSteps(steps) {
  return request('/execute', {
    method: 'POST',
    body: JSON.stringify({ steps }),
  });
}

/**
 * Fetch all saved sessions from the backend.
 * GET /sessions
 */
export async function fetchSessions() {
  return request('/sessions');
}

/**
 * Fetch a single session by ID.
 * GET /sessions/:id
 */
export async function fetchSession(id) {
  return request(`/sessions/${id}`);
}

/**
 * Delete a session.
 * DELETE /sessions/:id
 */
export async function deleteSession(id) {
  return request(`/sessions/${id}`, { method: 'DELETE' });
}