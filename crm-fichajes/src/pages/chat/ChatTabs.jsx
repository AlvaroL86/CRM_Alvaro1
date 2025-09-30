// src/pages/chat/ChatTabs.jsx
import { useState } from "react";
import ChatGeneral from "./ChatGeneral";
import ChatSaved from "./ChatSaved";
import ChatPrivate from "./ChatPrivate";
import ChatGroups from "./ChatGroups";
import ConnectedPanel from "./ConnectedPanel";

export default function ChatTabs() {
  const [tab, setTab] = useState("general"); // general | guardados | privados | grupos
  const [openWith, setOpenWith] = useState(null); // usuario para abrir privado desde panel

  function openPrivateFromPanel(user) {
    setOpenWith({ id: user.id, nombre: user.nombre });
    setTab("privados");
  }

  const Btn = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1 rounded ${
        tab === id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex gap-4 p-4">
      {/* Panel de conectados (ocultable) */}
      <ConnectedPanel onOpenPrivate={openPrivateFromPanel} />

      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Btn id="general">General</Btn>
            <Btn id="guardados">Guardados</Btn>
            <Btn id="privados">Privados</Btn>
            <Btn id="grupos">Grupos</Btn>
          </div>

          {tab === "grupos" && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("chat:new-group"))}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
              title="Crear chat grupal"
            >
              + Nuevo chat
            </button>
          )}
        </div>

        {/* Contenido */}
        {tab === "general"   && <ChatGeneral />}
        {tab === "guardados" && <ChatSaved   />}
        {tab === "privados"  && <ChatPrivate openWithUser={openWith} onOpened={() => setOpenWith(null)} />}
        {tab === "grupos"    && <ChatGroups  />}
      </div>
    </div>
  );
}
