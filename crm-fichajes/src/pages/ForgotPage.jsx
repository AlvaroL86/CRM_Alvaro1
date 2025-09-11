import { useState } from "react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    // Aquí llamarías a /auth/forgot o similar
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Recuperar contraseña</h2>
        <p className="text-gray-500 text-sm mb-4">
          Te enviaremos instrucciones a tu correo.
        </p>

        {sent ? (
          <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 border border-green-200">
            Si el correo existe, recibirás un email con los pasos.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="tucorreo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
              Enviarme instrucciones
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
