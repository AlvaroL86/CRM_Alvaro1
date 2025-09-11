// src/App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ForgotPage from "./pages/ForgotPage";
import RequestAccessPage from "./pages/RequestAccessPage";

import Dashboard from "./pages/Dashboard";
import Fichajes from "./pages/Fichajes";
import Ausencias from "./pages/Ausencias";
import Clientes from "./pages/Clientes";
import ClienteDetalle from "./pages/ClienteDetalle";
import Profile from "./pages/Profile";
import TicketsPage from "./pages/Tickets";

import Chat from "./pages/Chat";
import ChatGeneral from "./pages/chat/ChatGeneral";
import ChatSaved from "./pages/chat/ChatSaved";
import ChatPrivate from "./pages/chat/ChatPrivate";
import ChatGroups from "./pages/chat/ChatGroups";

import Users from "./pages/Users";
import UsersRoles from "./pages/admin/UsersRoles";

import MainLayout from "./layout/MainLayout";
import PrivateRoute from "./components/PrivateRoute";

import Calendario from "./pages/Calendario";

export default function App() {
  useEffect(() => {
    // init socket si quieres
  }, []);

  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/request-access" element={<RequestAccessPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Privado */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/fichajes" element={<Fichajes />} />
          <Route path="/ausencias" element={<Ausencias />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<TicketsPage />} />

          {/* Chat (rutas anidadas) */}
          <Route path="/chat" element={<Chat />}>
            <Route index element={<ChatGeneral />} />
            <Route path="saved" element={<ChatSaved />} />
            <Route path="private" element={<ChatPrivate />} />
            <Route path="groups" element={<ChatGroups />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin/users"
            element={
              <PrivateRoute roles={["admin", "supervisor"]}>
                <Users />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users-roles"
            element={
              <PrivateRoute roles={["admin"]}>
                <UsersRoles />
              </PrivateRoute>
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
