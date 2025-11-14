// src/main.jsx
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "@/context/AuthContext";
import { SoundPrefsProvider } from "@/context/SoundPrefsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* ✅ SoundPrefsProvider y AuthProvider en orden correcto */}
      <AuthProvider>
        <SoundPrefsProvider>
          <App />
        </SoundPrefsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
