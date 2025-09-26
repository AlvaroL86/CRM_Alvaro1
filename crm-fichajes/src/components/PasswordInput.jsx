// src/components/PasswordInput.jsx
import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder="Password", required=false }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="w-full rounded border p-2 pr-10"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
        title={show ? "Ocultar" : "Mostrar"}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
