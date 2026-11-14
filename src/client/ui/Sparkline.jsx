// Mini línea de una serie (valores null se saltan). Sin ejes: solo la forma de la tendencia.
export function Sparkline({ values, width = 84, height = 28, stroke = 'var(--color-series)' }) {
  const points = values.map((value, index) => [index, value]).filter(([, value]) => value != null);
  if (points.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const numbers = points.map(([, value]) => value);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const last = values.length - 1 || 1;
  const coords = points.map(([index, value]) => `${(2 + (index / last) * (width - 4)).toFixed(1)},${(height - 3 - ((value - min) / (max - min || 1)) * (height - 6)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" class="flex-none">
      <polyline points={coords} fill="none" stroke={stroke} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  );
}
