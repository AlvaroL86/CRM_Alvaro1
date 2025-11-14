import { useSoundPrefs } from "../../context/SoundPrefsContext";

export default function SoundSettings({ onClose }) {
  const { prefs, setPrefs, play } = useSoundPrefs();

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 15px 35px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600 }}>Preferencias de sonido</div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          {/* Estado */}
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Estado</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {["online", "away", "dnd"].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrefs((p) => ({ ...p, status: s, dnd: s === "dnd" }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: prefs.status === s ? "#eef4ff" : "#fff",
                  }}
                >
                  {s === "online" ? "En línea" : s === "away" ? "Ausente" : "No molestar"}
                </button>
              ))}
            </div>
          </div>

          {/* DND explícito */}
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!prefs.dnd}
              onChange={(e) => setPrefs((p) => ({ ...p, dnd: e.target.checked, status: e.target.checked ? "dnd" : (p.status === "dnd" ? "online" : p.status) }))}
            />
            No molestar (silencia todas las notificaciones)
          </label>

          {/* Volumen */}
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Volumen</div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={prefs.volume}
              onChange={(e) => setPrefs((p) => ({ ...p, volume: parseFloat(e.target.value) }))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Sonidos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Sonido (grupos)</div>
              <select
                value={prefs.groupSound}
                onChange={(e) => setPrefs((p) => ({ ...p, groupSound: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, marginTop: 6 }}
              >
                <option value="tone">Tono</option>
                <option value="off">Silenciado</option>
              </select>
              <button onClick={() => play("group")} style={{ marginTop: 6, border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}>Probar</button>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Sonido (privados)</div>
              <select
                value={prefs.privateSound}
                onChange={(e) => setPrefs((p) => ({ ...p, privateSound: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, marginTop: 6 }}
              >
                <option value="tone">Tono</option>
                <option value="off">Silenciado</option>
              </select>
              <button onClick={() => play("private")} style={{ marginTop: 6, border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px" }}>Probar</button>
            </div>
          </div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
