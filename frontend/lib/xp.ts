const XP_KEY = "player_xp";

export function getStoredXP(): number {
  try {
    const raw = localStorage.getItem(XP_KEY);
    if (raw) return parseInt(raw, 10);
  } catch {}
  return 0;
}

export function setStoredXP(xp: number): void {
  try {
    localStorage.setItem(XP_KEY, String(xp));
    window.dispatchEvent(new CustomEvent("xp-updated", { detail: xp }));
  } catch {}
}

export function spendXP(amount: number): boolean {
  const current = getStoredXP();
  if (current < amount) return false;
  setStoredXP(current - amount);
  return true;
}