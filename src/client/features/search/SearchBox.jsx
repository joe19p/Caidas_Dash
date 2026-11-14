// Buscador global en la barra azul (como el del cronograma). Cada palabra queda como chip al pulsar Enter o coma
// (Retroceso quita la última, Esc cierra); O muestra las comunicaciones con alguna palabra y Y las que tienen todas.
// Busca en el mes de la barra (ya cargado) y, a pedido, en todos los meses (searchCommunications). Cada resultado se
// puede abrir o elegir para comparar. Atajo: «/».
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx, dayLong, fmtInt, fmtPct, hourOf, monthLong } from '@/lib/format.mjs';
import { useLoad } from '@/lib/useLoad.mjs';
import { metricMatches, metricFold } from '@shared/metrics.mjs';
import { api } from '@/services/api.mjs';
import { dataKey, openCommunication, view } from '@/state/app.mjs';
import { commMonth, periodRange } from '@/state/period.mjs';
import {
  search, searchOpen, searchFocus, searchQuery, searchTerms, setSearch, commitSearchText, removeSearchTerm,
  selectedJobs, toggleSelected, selectMany, SELECTION_MAX
} from '@/state/search.mjs';
import { Checkbox } from '@/ui/Checkbox.jsx';
import { DestinationBar } from '@/ui/DestinationBar.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { Popover } from '@/ui/Popover.jsx';
import { Skeleton } from '@/ui/States.jsx';

const MODES = [['O', 'Cualquiera de las palabras'], ['Y', 'Todas las palabras']];
const ALL_DELAY_MS = 350;
const SHOWN_MAX = 200;

/** Nombre con las palabras buscadas resaltadas (los nombres de maqueta no llevan tildes; si llevan, va sin resaltar). */
function Highlighted({ name, terms }) {
  const folded = metricFold(name);
  if (!terms.length || folded.length !== name.length) return name;
  const marks = new Array(name.length).fill(false);
  terms.forEach(term => {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + 1)) marks.fill(true, at, at + term.length);
  });
  const parts = [];
  let start = 0;
  for (let index = 1; index <= name.length; index++) {
    if (index === name.length || marks[index] !== marks[start]) {
      const text = name.slice(start, index);
      parts.push(marks[start] ? <mark key={start} class="rounded-[3px] bg-warning-soft px-px text-ink">{text}</mark> : text);
      start = index;
    }
  }
  return parts;
}

/** Resumen de la caída de un envío, en una frase. */
function summary(item) {
  const base = item.base || 0;
  const top = item.top && base ? ` Más caída: ${item.top.name} (${fmtPct(item.top.count / base)} de la audiencia).` : '';
  return `${fmtInt(base)} personas, ${fmtPct(base ? item.sends / base : null)} enviado.${top}`;
}

function ResultRow({ item, terms, onOpen }) {
  const chosen = selectedJobs.value.has(item.job);
  const full = !chosen && selectedJobs.value.size >= SELECTION_MAX;
  return (
    <li class={cx('grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-[10px] px-2 py-2', chosen ? 'bg-brand-soft' : 'hover:bg-surface-muted')}>
      <Checkbox class="mt-0.5" checked={chosen} disabled={full} onChange={() => toggleSelected(item)}
        label={full ? `Máximo ${SELECTION_MAX} para comparar` : chosen ? `Quitar ${item.name} de las elegidas` : `Elegir ${item.name} para comparar`} />
      <span class="min-w-0">
        <button type="button" class="text-left text-[13px] font-semibold wrap-anywhere hover:underline" title="Abrir en «Por comunicación»"
          onMouseDown={event => event.preventDefault()} onClick={() => onOpen(item)}>
          <Highlighted name={item.name} terms={terms} />
        </button>
        <span class="mt-0.5 block text-xs text-ink-muted">{summary(item)}</span>
        <DestinationBar item={item} class="mt-1.5 h-1.5" />
      </span>
      <span class="text-right text-xs leading-relaxed text-ink-muted">{hourOf(item.start)}<br /><span class="font-mono">{item.job}</span></span>
    </li>
  );
}

/** Resultados agrupados por día, del más reciente al más antiguo. */
function ResultList({ items, terms, onOpen }) {
  const days = [];
  items.forEach(item => {
    const day = item.start.slice(0, 10);
    if (days[days.length - 1]?.day !== day) days.push({ day, items: [] });
    days[days.length - 1].items.push(item);
  });
  return (
    <div class="max-h-[min(460px,60vh)] overflow-y-auto px-2 pb-2">
      {days.map(group => (
        <section key={group.day} aria-label={dayLong(group.day)}>
          <h3 class="sticky top-0 z-10 bg-surface px-2 pt-2.5 pb-1 text-xs font-bold text-ink-muted first-letter:uppercase">{dayLong(group.day)}</h3>
          <ul class="flex flex-col gap-0.5">{group.items.map(item => <ResultRow key={item.job} item={item} terms={terms} onOpen={onOpen} />)}</ul>
        </section>
      ))}
    </div>
  );
}

function Results({ month, onOpen }) {
  const { mode, scope } = search.value;
  const terms = searchTerms.value;
  // En todo: se espera a que se deje de escribir antes de pedir al servidor.
  const [allQuery, setAllQuery] = useState(searchQuery.value);
  useEffect(() => {
    const timer = setTimeout(() => setAllQuery(searchQuery.value), ALL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchQuery.value]);
  const inMonth = scope === 'month';
  const [monthState] = useLoad(inMonth && month ? `${dataKey.value}|${month}` : '', () => api.getMonth(month));
  const [allState] = useLoad(!inMonth && allQuery ? `${dataKey.value}|${mode}:${allQuery}` : '', () => api.searchAll(allQuery, mode), { keepPrevious: true });
  if (!terms.length) {
    return <p class="px-4 py-4 text-[13px] text-ink-muted">Escribe parte del nombre, la familia o el JobID. Con Enter o coma fijas la palabra y puedes sumar otras.</p>;
  }
  const state = inMonth ? monthState : allState;
  if (state.status === 'error') return <p class="px-4 py-4 text-[13px] text-danger-ink">{state.error}</p>;
  if (!state.data) return <div class="flex flex-col gap-2 p-4"><Skeleton class="h-14" /><Skeleton class="h-14" /></div>;
  const inMonthItems = inMonth
    ? state.data.items.filter(item => metricMatches(item, terms, mode)).sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0))
    : [];
  // Como en todos los meses (SEARCH_LIMIT del servidor): se dibujan las más recientes, no cientos de filas.
  const items = inMonth ? inMonthItems.slice(0, SHOWN_MAX) : state.data.items;
  const total = inMonth ? inMonthItems.length : state.data.total;
  const where = inMonth ? `en ${monthLong(month)}` : 'en todos los meses';
  return (
    <>
      <div class={cx('flex items-center justify-between gap-3 px-4 pt-3 pb-1.5 text-[12.5px] text-ink-muted', state.status === 'loading' && 'opacity-60')}>
        <span aria-live="polite">
          <b class="text-ink">{fmtInt(total)}</b> {total === 1 ? 'comunicación' : 'comunicaciones'} {where} con {mode === 'Y' ? 'todas las palabras' : 'alguna de las palabras'}
          {total > items.length ? `. Se muestran las ${fmtInt(items.length)} más recientes.` : '.'}
        </span>
        {items.length > 1 && (
          <button type="button" class="flex-none font-semibold text-brand-text hover:underline" onMouseDown={event => event.preventDefault()} onClick={() => selectMany(items)}>
            Elegir {items.length > SELECTION_MAX ? `las primeras ${SELECTION_MAX}` : `las ${items.length}`}
          </button>
        )}
      </div>
      {items.length ? <ResultList items={items} terms={terms} onOpen={onOpen} />
        : <p class="px-4 pb-4 text-[13px] text-ink-muted">Ninguna comunicación coincide {where}.</p>}
      <div class="flex items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-2.5 text-[13px]">
        <span class="text-ink-muted">{inMonth ? '¿No está? Puede ser de otro mes.' : 'Buscando en todos los meses con envíos.'}</span>
        <button type="button" class="font-semibold text-brand-text hover:underline" onMouseDown={event => event.preventDefault()}
          onClick={() => setSearch({ scope: inMonth ? 'all' : 'month' })}>
          {inMonth ? 'Buscar en todos los meses' : `Solo ${monthLong(month)}`}
        </button>
      </div>
    </>
  );
}

export function SearchBox() {
  const root = useRef(null);
  const input = useRef(null);
  const { terms, text, mode } = search.value;
  const open = searchOpen.value;
  const month = view.value === 'comm' ? commMonth.value : periodRange.value?.to;

  useEffect(() => {
    const onKey = event => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      searchOpen.value = true;
      input.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (searchFocus.value) input.current?.focus(); }, [searchFocus.value]);

  const onKeyDown = event => {
    if ((event.key === 'Enter' || event.key === ',') && text.trim()) { event.preventDefault(); commitSearchText(); }
    else if (event.key === 'Backspace' && !text && terms.length) removeSearchTerm(terms.length - 1);
  };
  const openItem = item => {
    searchOpen.value = false;
    openCommunication({ day: item.start.slice(0, 10), job: item.job });
  };
  return (
    <div ref={root} role="search" class="relative min-w-0 flex-[1_1_240px] sm:max-w-[720px]">
      <div class="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 pr-1 pl-2.5 ring-1 ring-white/50 ring-inset focus-within:bg-white/15 focus-within:ring-white"
        onClick={() => { searchOpen.value = true; input.current?.focus(); }}>
        <Icon name="search" size={16} class="flex-none text-white/85" />
        <span class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {terms.map((term, index) => (
            <span key={term} class="inline-flex max-w-32 flex-none items-center gap-0.5 rounded-full border border-white/60 py-0.5 pr-1 pl-2 text-xs font-semibold text-white">
              <span class="truncate">{term}</span>
              <button type="button" class="rounded-full p-0.5 hover:bg-white/20" aria-label={`Quitar ${term}`}
                onClick={event => { event.stopPropagation(); removeSearchTerm(index); }}><Icon name="close" size={12} /></button>
            </span>
          ))}
          <input ref={input} type="text" value={text} autocomplete="off" spellcheck={false} aria-label="Buscar comunicación"
            placeholder={terms.length ? 'Otra palabra…' : 'Buscar comunicación o JobID… /'}
            onInput={event => { setSearch({ text: event.currentTarget.value }); searchOpen.value = true; }} onKeyDown={onKeyDown}
            onFocus={() => { searchOpen.value = true; }}
            class="h-full min-w-16 flex-1 bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none" />
        </span>
        <span role="group" aria-label="Cómo combinar las palabras" class="flex flex-none rounded-lg bg-white/10 p-0.5">
          {MODES.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} title={label} aria-label={label}
              onClick={event => { event.stopPropagation(); setSearch({ mode: id }); }}
              class={cx('rounded-md px-2 py-0.5 text-xs font-bold', mode === id ? 'bg-white text-chrome' : 'text-white hover:bg-white/15')}>{id}</button>
          ))}
        </span>
      </div>
      <Popover open={open} onClose={() => { searchOpen.value = false; }} anchor={root} label="Resultados de la búsqueda" focusOnClose="input" class="w-[620px] overflow-hidden">
        <Results month={month} onOpen={openItem} />
      </Popover>
    </div>
  );
}
