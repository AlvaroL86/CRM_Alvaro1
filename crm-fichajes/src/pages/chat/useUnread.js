import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "chat_unread_v1";

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function save(obj) {
  try { sessionStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

export default function useUnread(activeRoomId) {
  const [map, setMap] = useState(() => load());
  const activeRef = useRef(activeRoomId);
  useEffect(() => { activeRef.current = activeRoomId; }, [activeRoomId]);

  const unreadCount = useCallback((roomId) => Number(map[roomId] || 0), [map]);

  const resetUnread = useCallback((roomId) => {
    setMap((m) => {
      if (!m[roomId]) return m;
      const n = { ...m, [roomId]: 0 };
      save(n);
      return n;
    });
  }, []);

  const notifyOnMessage = useCallback((msg) => {
    const roomId = msg?.room_id;
    if (!roomId) return;
    if (roomId === activeRef.current) return; // sala activa -> no suma
    setMap((m) => {
      const n = { ...m, [roomId]: Number(m[roomId] || 0) + 1 };
      save(n);
      return n;
    });
  }, []);

  return { unreadCount, resetUnread, notifyOnMessage };
}
