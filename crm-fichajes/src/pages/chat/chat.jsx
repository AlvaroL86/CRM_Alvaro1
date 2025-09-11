// src/pages/chat/Chat.jsx
import { useState } from "react";
import ChatTabs from "./ChatTabs";
import ChatGeneral from "./ChatGeneral";
import NewChatModal from "./NewChatModal";

export default function Chat() {
  const [tab, setTab] = useState("general");
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-4">
      <ChatTabs active={tab} onChange={setTab} onNewChat={()=>setShowNew(true)} />
      {tab === "general" && <ChatGeneral />}
      {tab === "saved"   && <div className="bg-white rounded shadow p-4">Guardados (en construcción)</div>}
      {tab === "private" && <div className="bg-white rounded shadow p-4">Privados (en construcción)</div>}
      {tab === "groups"  && <div className="bg-white rounded shadow p-4">Grupos (listado/entrar en construcción)</div>}
      <NewChatModal open={showNew} onClose={()=>setShowNew(false)} onCreate={()=>setShowNew(false)} />
    </div>
  );
}
