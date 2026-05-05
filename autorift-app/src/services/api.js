export async function submitSteps(steps) {
  console.log('Mock submitSteps:', steps);
  return { success: true };
}

export async function executeSteps(steps) {
  console.log('Mock executeSteps:', steps);
  return { log: ['Mock: Step 1 executed', 'Mock: Step 2 executed'] };
}

export async function fetchSessions() { return []; }
export async function fetchSession(id) { return { id, steps: [] }; }
export async function deleteSession(id) { return { success: true }; }