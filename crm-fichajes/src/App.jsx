// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import MainLayout from './layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Routes>
      {/* Redirección desde raíz */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Rutas protegidas dentro del layout */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute role="admin">
              <Users />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
