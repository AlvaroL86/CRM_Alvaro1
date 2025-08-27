// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [role, setRole] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("rol");
    setRole(storedRole);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Bienvenido al panel de {role}</h1>

      {role === "Administrador" ? (
        <div className="space-y-4">
          <p>Acceso completo al sistema.</p>
          <ul className="list-disc list-inside">
            <li>Ver y gestionar usuarios</li>
            <li>Ver fichajes</li>
            <li>Ver y registrar ausencias</li>
            <li>Configurar empresa</li>
          </ul>
        </div>
      ) : role === "Usuario" ? (
        <div>
          <p>Acceso limitado. Puedes ver tu información y fichajes.</p>
        </div>
      ) : (
        <p>Cargando rol...</p>
      )}
    </div>
  );
}
