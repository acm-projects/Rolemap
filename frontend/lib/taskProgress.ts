const TASK_PROGRESS_KEY = "task_progress_pct";

export function getStoredTaskProgress(): number {
  try {
    const raw = localStorage.getItem(TASK_PROGRESS_KEY);
    if (raw !== null) return parseInt(raw, 10);
  } catch {}
  return -1;
}

export function setStoredTaskProgress(pct: number): void {
  try {
    localStorage.setItem(TASK_PROGRESS_KEY, String(pct));
    window.dispatchEvent(new CustomEvent("task-progress-updated", { detail: pct }));
  } catch {}
}
