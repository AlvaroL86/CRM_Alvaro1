// src/services/fichajesActions.js
import { apiGet, apiPost } from "./api";
import { sqlNowLocal } from "./time";
import { emitFichajesChanged } from "./fichajesBus";

// Estado actual desde el backend
export const getEstado = () => apiGet("/fichajes/estado-actual");

// Acción genérica: inserta un evento de fichaje
async function marcar(tipo, extra = {}) {
  const payload = {
    tipo,                      // entrada | pausa | vuelta | salida
    fecha_hora: sqlNowLocal(), // hora local formateada
    ...extra,
  };
  await apiPost("/fichajes", payload);
  emitFichajesChanged(); // avisamos a toda la app
  return getEstado();    // devolvemos el nuevo estado
}

// Acciones específicas
export const iniciar   = () => marcar("entrada");
export const pausar    = ({ motivo, expectedMinutes = null, notas = "" } = {}) =>
  marcar("pausa", { motivo, duracion_prevista_min: expectedMinutes, notas });
export const reanudar  = () => marcar("vuelta");
export const finalizar = ({ notas = "" } = {}) =>
  marcar("salida", { notas });
