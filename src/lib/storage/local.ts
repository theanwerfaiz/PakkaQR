/** localStorage helpers that never throw (private mode, blocked storage, quota). */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Preferences are best-effort.
  }
}

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Best-effort.
  }
}

/** sessionStorage key the generator reads on load ("recreate as forever code"). */
export const HANDOFF_KEY = 'pakkaqr:handoff';
/** A design handed to the generator along with content (templates). */
export const HANDOFF_DESIGN_KEY = 'pakkaqr:handoff-design';

/** Reads and removes a sessionStorage value. */
export function takeSession(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
