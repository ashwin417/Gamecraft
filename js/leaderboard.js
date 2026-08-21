/* ============================================================
   leaderboard.js
   Persists top scores in the browser via LocalStorage.
   Tracks two independent leaderboards — "arcade" and "story" —
   inside one entries array, distinguished by an entry.mode field
   (entries saved before Story Mode existed have no mode and are
   treated as "arcade" for backward compatibility).
   ============================================================ */

const LEADERBOARD_KEY = "cyberGuardian.leaderboard.v1";
const MAX_ENTRIES = 10;
const DEFAULT_MODE = "arcade";

class Leaderboard {
  constructor() {
    this.entries = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn("Leaderboard: failed to read LocalStorage", e);
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.entries));
    } catch (e) {
      console.warn("Leaderboard: failed to write LocalStorage", e);
    }
  }

  _modeOf(entry) {
    return entry.mode || DEFAULT_MODE;
  }

  getTop(limit, mode) {
    const targetMode = mode || DEFAULT_MODE;
    return this.entries
      .filter((e) => this._modeOf(e) === targetMode)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || MAX_ENTRIES);
  }

  getPersonalBest(name, mode) {
    const targetMode = mode || DEFAULT_MODE;
    const mine = this.entries.filter(
      (e) => e.name.toLowerCase() === name.toLowerCase() && this._modeOf(e) === targetMode
    );
    if (mine.length === 0) return 0;
    return Math.max(...mine.map((e) => e.score));
  }

  /**
   * Adds a new run and returns { entries, rank } where rank is the
   * 1-based position within that mode's top list, or null if it
   * didn't make the cut. `extra` (optional) is merged into the saved
   * entry — Story Mode uses it to store floors cleared / mission time.
   */
  addEntry(name, score, mode, extra) {
    const targetMode = mode || DEFAULT_MODE;
    const entry = Object.assign({ name, score, date: new Date().toISOString(), mode: targetMode }, extra || {});
    this.entries.push(entry);
    this._save();

    const ranked = this.getTop(MAX_ENTRIES, targetMode);
    const rank = ranked.findIndex((e) => e.date === entry.date && e.score === entry.score && e.name === entry.name);
    return { entries: ranked, rank: rank === -1 ? null : rank + 1 };
  }

  /** Clears entries for a single mode, or everything if `mode` is omitted. */
  clear(mode) {
    if (mode) {
      this.entries = this.entries.filter((e) => this._modeOf(e) !== mode);
    } else {
      this.entries = [];
    }
    this._save();
  }
}
