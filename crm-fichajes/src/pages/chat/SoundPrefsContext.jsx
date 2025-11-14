import { createContext, useContext, useMemo, useState, useCallback } from "react";

const CKEY = "chat_sound_prefs_v1";
const defaultPrefs = {
  dnd: false,
  volume: 0.7,
  groupTone: "ding",
  privateTone: "pop",
  mutedRooms: {}, // { [roomId]: true }
};

const tones = {
  ding: 880,
  pop: 660,
  soft: 520,
};

function playBeep(freq, volume = 0.7, ms = 180) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.03 * volume;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ms);
  } catch {}
}

const SoundPrefsContext = createContext(null);

export function SoundPrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(CKEY) || "{}")) }; }
    catch { return defaultPrefs; }
  });

  const save = useCallback((next) => {
    setPrefs(next);
    try { localStorage.setItem(CKEY, JSON.stringify(next)); } catch {}
  }, []);

  const set = useCallback((patch) => save({ ...prefs, ...patch }), [prefs, save]);

  const isRoomMuted = useCallback((roomId) => !!prefs.mutedRooms?.[roomId], [prefs.mutedRooms]);

  const toggleRoomMute = useCallback((roomId) => {
    const mutedRooms = { ...(prefs.mutedRooms || {}) };
    if (mutedRooms[roomId]) delete mutedRooms[roomId];
    else mutedRooms[roomId] = true;
    save({ ...prefs, mutedRooms });
  }, [prefs, save]);

  const play = useCallback((kind /* 'group' | 'private' */) => {
    if (prefs.dnd) return;
    const freq = tones[kind === "private" ? prefs.privateTone : prefs.groupTone] || 700;
    playBeep(freq, prefs.volume);
  }, [prefs]);

  const value = useMemo(() => ({
    prefs, set, play, isRoomMuted, toggleRoomMute,
    tones: Object.keys(tones),
  }), [prefs, set, play, isRoomMuted, toggleRoomMute]);

  return <SoundPrefsContext.Provider value={value}>{children}</SoundPrefsContext.Provider>;
}

export function useSoundPrefs() {
  const ctx = useContext(SoundPrefsContext);
  if (!ctx) throw new Error("SoundPrefsProvider missing");
  return ctx;
}
