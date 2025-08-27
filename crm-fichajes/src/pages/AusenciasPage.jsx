import { useEffect, useState } from 'react';
import api from '../services/api';

function AusenciasPage() {
  const [ausencias, setAusencias] = useState([]);
  const [nueva, setNueva] = useState({
    tipo: '',
    motivo: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [mensaje, setMensaje] = useState('');

  const cargarAusencias = async () => {
    try {
      const res = await api.get('/ausencias');
      setAusencias(res.data);
    } catch (err) {
      console.error('Error al cargar ausencias', err);
    }
  };

  const registrarAusencia = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ausencias', nueva);
      setMensaje('✅ Ausencia registrada');
      setNueva({ tipo: '', motivo: '', fecha_inicio: '', fecha_fin: '' });
      cargarAusencias();
    } catch (err) {
      setMensaje('❌ Error al registrar ausencia');
    }
  };

  useEffect(() => {
    cargarAusencias();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: 'auto' }}>
      <h2>Mis ausencias</h2>

      <form onSubmit={registrarAusencia} style={{ marginBottom: '1em' }}>
        <select
          value={nueva.tipo}
          onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}
          required
        >
          <option value="">Selecciona tipo</option>
          <option value="vacaciones">Vacaciones</option>
          <option value="enfermedad">Enfermedad</option>
          <option value="permiso">Permiso</option>
        </select>
        <input
          type="text"
          placeholder="Motivo"
          value={nueva.motivo}
          onChange={(e) => setNueva({ ...nueva, motivo: e.target.value })}
          required
        />
        <input
          type="date"
          value={nueva.fecha_inicio}
          onChange={(e) => setNueva({ ...nueva, fecha_inicio: e.target.value })}
          required
        />
        <input
          type="date"
          value={nueva.fecha_fin}
          onChange={(e) => setNueva({ ...nueva, fecha_fin: e.target.value })}
          required
        />
        <button type="submit">Guardar</button>
      </form>

      {mensaje && <p>{mensaje}</p>}

      <table border="1" cellPadding="6" width="100%">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Desde</th>
            <th>Hasta</th>
          </tr>
        </thead>
        <tbody>
          {ausencias.map((a, i) => (
            <tr key={i}>
              <td>{a.tipo}</td>
              <td>{a.motivo}</td>
              <td>{a.fecha_inicio}</td>
              <td>{a.fecha_fin}</td>
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
