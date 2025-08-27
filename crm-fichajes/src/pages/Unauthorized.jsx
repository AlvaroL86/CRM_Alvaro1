export default function Unauthorized() {
  return (
    <div className="text-center p-10">
      <h1 className="text-3xl font-bold text-red-600">⚠️ Acceso no autorizado</h1>
      <p className="text-gray-700 mt-4">No tienes permisos para ver esta página.</p>
    </div>
  );
}
