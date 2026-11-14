// Nombre de maqueta que puede pasar de línea después de cada «_» (los nombres no tienen espacios): así el final
// (segmento, versión), que distingue un envío de otro, no se corta a la mitad.
export function BreakableName({ name }) {
  const parts = String(name).split('_');
  return parts.map((part, index) => (index < parts.length - 1 ? <>{part}_<wbr /></> : part));
}
