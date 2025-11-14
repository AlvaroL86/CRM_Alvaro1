// src/context/SoundPrefsContext.jsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const LS_KEY = "chat_sound_prefs_v1";

const defaultState = {
  dnd: false,
  groupTone: "toneA",      // 'off' | 'toneA' | 'toneB'
  privateTone: "toneB",    // 'off' | 'toneA' | 'toneB'
  mutedRooms: {},          // { [roomId]: true }
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}
function save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

const SoundCtx = createContext(null);

export function SoundPrefsProvider({ children }) {
  const [state, setState] = useState(() => load());

  const setPartial = (patch) =>
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });

  /* -------- WebAudio tiny beeps -------- */
  const playTone = useCallback(async (tone = "toneA") => {
    if (tone === "off") return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone === "toneB" ? 660 : 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 180);
  }, []);

  const play = useCallback(
    (kind /* 'group' | 'private' */, roomId) => {
      if (state.dnd) return;
      if (roomId && state.mutedRooms?.[roomId]) return;
      const tone = kind === "private" ? state.privateTone : state.groupTone;
      playTone(tone);
    },
    [state.dnd, state.groupTone, state.privateTone, state.mutedRooms, playTone]
  );

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

  const value = useMemo(
    () => ({
      dnd: state.dnd,
      groupTone: state.groupTone,
      privateTone: state.privateTone,
      mutedRooms: state.mutedRooms,
      setDnd: (v) => setPartial({ dnd: !!v }),
      setGroupTone: (v) => setPartial({ groupTone: v }),
      setPrivateTone: (v) => setPartial({ privateTone: v }),
      isRoomMuted,
      toggleRoomMute,
      play,
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

/* ---- Botón pequeño de campana para la cabecera del hilo ---- */
export function SoundPrefsButton() {
  const { dnd, setDnd, groupTone, privateTone, setGroupTone, setPrivateTone } = useSoundPrefs();
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
            width: 240,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sonidos</div>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={dnd} onChange={(e) => setDnd(e.target.checked)} />
            No molestar
          </label>

          <div style={{ height: 8 }} />

          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Mensaje de grupo</div>
            <select
              value={groupTone}
              onChange={(e) => setGroupTone(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            >
              <option value="toneA">Tono A</option>
              <option value="toneB">Tono B</option>
              <option value="off">Silenciado</option>
            </select>
          </div>

          <div style={{ height: 8 }} />

          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Mensaje privado</div>
            <select
              value={privateTone}
              onChange={(e) => setPrivateTone(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            >
              <option value="toneB">Tono B</option>
              <option value="toneA">Tono A</option>
              <option value="off">Silenciado</option>
            </select>
          </div>

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
