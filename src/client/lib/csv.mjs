// Descarga de tablas para Excel: CSV en UTF-8 con BOM (así Excel respeta las tildes), separado por comas y con punto
// decimal, como se muestran las cifras en la app. Los porcentajes van como número (0.1234), para poder calcular con ellos.

const BOM = String.fromCharCode(0xfeff);

/** Texto de una celda: entre comillas si lleva coma, comillas o saltos de línea. Sin fórmulas: «=», «+», «-» o «@» al inicio van con apóstrofo. */
export function csvCell(value) {
  if (value == null) return '';
  // Hasta 6 decimales: las tasas no necesitan más y Excel las muestra limpias.
  if (typeof value === 'number') return Number.isFinite(value) ? String(Math.round(value * 1e6) / 1e6) : '';
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** columns: [{ label, value: fila → valor }]. Devuelve el texto del CSV (con BOM). */
export function toCsv(columns, rows) {
  const lines = [columns.map(column => csvCell(column.label)).join(',')];
  rows.forEach(row => lines.push(columns.map(column => csvCell(column.value(row))).join(',')));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Nombre de archivo sin caracteres que Windows no acepta: «Motivos PROMO_VIAJES 2026-11-14.csv». */
export function csvName(...parts) {
  return `${parts.filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120)}.csv`;
}

/** Descarga el CSV en el navegador. Devuelve false si el navegador no lo permitió. */
export function downloadCsv(filename, columns, rows) {
  try {
    const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
