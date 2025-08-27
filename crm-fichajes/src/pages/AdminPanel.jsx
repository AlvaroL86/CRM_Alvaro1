import { useEffect, useState } from 'react';
import api from '../services/api';

function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [online, setOnline] = useState([]);
  const [resumen, setResumen] = useState([]);

  useEffect(() => {
    obtenerUsuarios();
    obtenerOnline();
    obtenerResumen();
  }, []);

  const obtenerUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch {
      console.error('Error al cargar usuarios');
    }
  };

  const obtenerOnline = async () => {
    try {
      const res = await api.get('/usuarios/online');
      setOnline(res.data);
    } catch {
      console.error('Error al cargar usuarios online');
    }
  };

  const obtenerResumen = async () => {
    try {
      const res = await api.get('/fichajes/resumen-admin');
      setResumen(res.data);
    } catch {
      console.error('Error al cargar resumen');
    }
  };

  return (
    <div>
      <h1>Panel de Administrador</h1>

      <h2>Usuarios registrados</h2>
      <ul>
        {usuarios.map((u) => (
          <li key={u.id}>{u.username} ({u.rol})</li>
        ))}
      </ul>

      <h2>Usuarios conectados ahora</h2>
      <ul>
        {online.map((u, i) => (
          <li key={i}>{u.usuario} - Entrada a las {u.entrada_hora}</li>
        ))}
      </ul>

      <h2>Resumen de fichajes (hoy)</h2>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Estado</th>
            <th>Último fichaje</th>
            <th>Tiempo trabajado</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((r, i) => (
            <tr key={i}>
              <td>{r.usuario}</td>
              <td>{r.estado}</td>
              <td>{r.ultimo_fichaje?.slice(11, 16) || '-'}</td>
              <td>{r.tiempo_trabajado_hoy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


export default function Dashboard() {
  return <h2 className="text-2xl font-bold">Dashboard</h2>;
}
// Cambia el nombre a AdminPanel, Users, AusenciasPage, etc según el archivo
