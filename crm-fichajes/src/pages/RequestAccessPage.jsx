import { useState } from "react";

export default function RequestAccessPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
  });
  const [ok, setOk] = useState(false);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    // Aquí guardarías en una tabla "solicitudes" para que el superadmin apruebe
    // apiPost('/auth/request-access', form)
    setOk(true);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Solicitar registro</h2>
        <p className="text-gray-500 text-sm mb-4">
          Rellena tus datos. Un administrador revisará tu solicitud.
        </p>

        {ok ? (
          <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 border border-green-200">
            ¡Solicitud enviada! Te avisaremos por correo cuando sea aprobada.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                <input
                  name="nombre"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.nombre}
                  onChange={onChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Apellidos</label>
                <input
                  name="apellidos"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.apellidos}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                name="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Teléfono</label>
              <input
                name="telefono"
                pattern="[0-9+ ]{6,20}"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.telefono}
                onChange={onChange}
                required
              />
            </div>

            <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
              Enviar solicitud
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
