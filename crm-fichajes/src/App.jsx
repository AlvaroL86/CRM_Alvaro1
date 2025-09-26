// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ForgotPage from "./pages/ForgotPage";
import RequestAccessPage from "./pages/RequestAccessPage";

import Dashboard from "./pages/Dashboard";
import Fichajes from "./pages/Fichajes";
import Ausencias from "./pages/Ausencias";
import Calendario from "./pages/Calendario";
import Clientes from "./pages/Clientes";
import ClientesImport from "./pages/ClientesImport";
import ClienteDetalle from "./pages/ClienteDetalle";
import Profile from "./pages/Profile";
import TicketsPage from "./pages/Tickets";

import Chat from "./pages/chat/ChatTabs";
import ChatGeneral from "./pages/chat/ChatGeneral";
import ChatSaved from "./pages/chat/ChatSaved";
import ChatPrivate from "./pages/chat/ChatPrivate";
import ChatGroups from "./pages/chat/ChatGroups";

import Users from "./pages/Users";
import UsersRoles from "./pages/admin/UsersRoles";

import MainLayout from "./pages/MainLayout";
import PrivateGuard from "./components/PrivateGuard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/request-access" element={<RequestAccessPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<PrivateGuard />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/fichajes" element={<Fichajes />} />
          <Route path="/ausencias" element={<Ausencias />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/import" element={<ClientesImport />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<TicketsPage />} />

          {/* Chat anidado */}
          <Route path="/chat" element={<Chat />}>
            <Route index element={<ChatGeneral />} />
            <Route path="saved" element={<ChatSaved />} />
            <Route path="private" element={<ChatPrivate />} />
            <Route path="groups" element={<ChatGroups />} />
          </Route>

          {/* Admin: por rol O por permiso */}
          <Route element={<PrivateGuard roles={["admin","supervisor"]} perm="usuarios.usersview" />}>
            <Route path="/admin/users" element={<Users />} />
          </Route>
          <Route element={<PrivateGuard roles={["admin"]} />}>
            <Route path="/admin/users-roles" element={<UsersRoles />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
