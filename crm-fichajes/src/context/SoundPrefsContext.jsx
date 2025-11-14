// src/context/SoundPrefsContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/* ====== Persistencia ====== */
const LS_KEY = "chat_sound_prefs_v1";

const DEFAULT = {
  dnd: false,                  // No molestar (silencia todo)
  volume: 0.8,                 // 0..1
  groupTone: "toneA",          // 'off' | 'toneA' | 'toneB' | 'soft'
  privateTone: "toneB",        // 'off' | 'toneA' | 'toneB' | 'soft'
  mutedRooms: {},              // { [roomId]: true } -> silenciar por sala
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
function save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

/* ====== WebAudio beep pequeño ====== */
const toneFreq = {
  toneA: 880, // más agudo
  toneB: 660, // más grave
  soft: 520,
};
function playBeep({ freq = 700, volume = 0.8, ms = 180 }) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.035 * volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, ms);
  } catch {}
}

/* ====== Contexto ====== */
const SoundCtx = createContext(null);

export function SoundPrefsProvider({ children }) {
  const [state, setState] = useState(() => load());

  const setPartial = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const isRoomMuted = useCallback(
    (roomId) => !!state.mutedRooms?.[roomId],
    [state.mutedRooms]
  );

  const toggleRoomMute = useCallback((roomId) => {
    setState((prev) => {
      const mutedRooms = { ...(prev.mutedRooms || {}) };
      if (mutedRooms[roomId]) delete mutedRooms[roomId];
      else mutedRooms[roomId] = true;
      const next = { ...prev, mutedRooms };
      save(next);
      return next;
    });
  }, []);

  /** Reproducir un tono respetando DND y muteos por sala */
  const play = useCallback(
    (kind /* 'group' | 'private' */, roomId) => {
      if (state.dnd) return;
      if (roomId && state.mutedRooms?.[roomId]) return;
      const key = kind === "private" ? state.privateTone : state.groupTone;
      if (key === "off") return;
      const freq = toneFreq[key] ?? 700;
      playBeep({ freq, volume: state.volume });
    },
    [state.dnd, state.groupTone, state.privateTone, state.mutedRooms, state.volume]
  );

  const value = useMemo(
    () => ({
      // estado
      dnd: state.dnd,
      volume: state.volume,
      groupTone: state.groupTone,
      privateTone: state.privateTone,
      mutedRooms: state.mutedRooms,
      // setters
      setDnd: (v) => setPartial({ dnd: !!v }),
      setVolume: (v) => setPartial({ volume: Math.max(0, Math.min(1, Number(v) || 0)) }),
      setGroupTone: (v) => setPartial({ groupTone: v }),
      setPrivateTone: (v) => setPartial({ privateTone: v }),
      // helpers
      isRoomMuted,
      toggleRoomMute,
      play, // play(kind, roomId?)
    }),
    [state, setPartial, isRoomMuted, toggleRoomMute, play]
  );

  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>;
}

export function useSoundPrefs() {
  const ctx = useContext(SoundCtx);
  if (!ctx) throw new Error("useSoundPrefs must be used inside <SoundPrefsProvider>");
  return ctx;
}

/* ====== Botón popup pequeño (campana) ====== */
export function SoundPrefsButton() {
  const {
    dnd, setDnd,
    groupTone, setGroupTone,
    privateTone, setPrivateTone,
    volume, setVolume,
  } = useSoundPrefs();

  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Preferencias de sonido"
        style={{ border: "none", background: "transparent", cursor: "pointer" }}
      >
        🔔
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: 6,
            zIndex: 50,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            padding: 10,
            width: 260,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sonidos</div>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={dnd} onChange={(e) => setDnd(e.target.checked)} />
            No molestar
          </label>

          <div style={{ height: 8 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Grupo</div>
              <select value={groupTone} onChange={(e) => setGroupTone(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
                <option value="toneA">Tono A</option>
                <option value="toneB">Tono B</option>
                <option value="soft">Suave</option>
                <option value="off">Silenciado</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Privado</div>
              <select value={privateTone} onChange={(e) => setPrivateTone(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
                <option value="toneB">Tono B</option>
                <option value="toneA">Tono A</option>
                <option value="soft">Suave</option>
                <option value="off">Silenciado</option>
              </select>
            </div>
          </div>

          <div style={{ height: 8 }} />

          <label style={{ fontSize: 12, color: "#666" }}>
            Volumen
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: "4px 8px" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
