// tiempo en LOCAL, sin usar toISOString (que es UTC)
const pad = (n) => String(n).padStart(2, "0");

export function sqlNowLocal(d = new Date()) {
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + " " +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes()) + ":" +
    pad(d.getSeconds())
  );
}

// Acepta "YYYY-MM-DD HH:mm:ss" o ISO; devolvemos Date o null
export function parseSQLLocal(value) {
  if (!value) return null;
  const str = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
