import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from "../context/AuthContext";

function FichajePanel() {
  const [estado, setEstado] = useState('');
  const [tiempo, setTiempo] = useState('');
  const [mensaje, setMensaje] = useState('');

  const obtenerEstado = async () => {
    try {
      const res = await api.get('/fichajes/estado-actual');
      setEstado(res.data.estado);
    } catch {
      setEstado('desconocido');
    }
  };

  const obtenerTiempoHoy = async () => {
    try {
      const res = await api.get('/fichajes/tiempo-hoy');
      setTiempo(res.data.tiempo_trabajado);
    } catch {
      setTiempo('0h 0min');
    }
  };

  const marcarFichaje = async (tipo) => {
    try {
      await api.post('/fichajes', {
        tipo,
        fecha_hora: new Date().toISOString(),
        motivo: null,
        duracion: null,
      });
      setMensaje(`✅ Fichaje de tipo ${tipo} registrado`);
      obtenerEstado();
      obtenerTiempoHoy();
    } catch {
      setMensaje('❌ Error al fichar');
    }
  };

  useEffect(() => {
    obtenerEstado();
    obtenerTiempoHoy();
  }, []);

  return (
    <div>
      <h2>Estado actual: {estado}</h2>
      <p>Tiempo trabajado hoy: {tiempo}</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '1em' }}>
        <button onClick={() => marcarFichaje('entrada')}>Entrada</button>
        <button onClick={() => marcarFichaje('salida')}>Salida</button>
        <button onClick={() => marcarFichaje('pausa')}>Pausa</button>
        <button onClick={() => marcarFichaje('vuelta')}>Vuelta</button>
      </div>
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
    </div>
  );
}

export default FichajePanel;
