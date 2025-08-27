import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-gray-800">CRM Fichajes</h1>
      <div className="flex items-center gap-4">
        <button
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
          onClick={() => navigate("/profile")}
          title="Perfil"
        >
          <FaUserCircle size={24} />
          <span className="hidden sm:inline">Mi Perfil</span>
        </button>
      </div>
    </header>
  );
}
