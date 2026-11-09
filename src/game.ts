export const ROUND_MS = 60_000;
export const GENERATIONS = [
  ['Kanto', 151], ['Johto', 100], ['Hoenn', 135], ['Sinnoh', 107],
  ['Unova', 156], ['Kalos', 72], ['Alola', 88], ['Galar', 96], ['Paldea', 120],
] as const;
export type Mode = 'random' | 'daily';
export type Pokemon = { id: number; name: string; types: string[]; images: string[] };
export function hash(text: string) { let value = 2166136261; for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619); return value >>> 0; }
export function utcDay(date = new Date()) { return date.toISOString().slice(0, 10); }
export function validDay(value: string | null): value is string { return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && utcDay(new Date(value)) === value; }
export function dailyId(day: string) { return 1 + hash(`sketch-mon-v1:${day}`) % 1025; }
export function remaining(deadline: number, now: number) { return Math.max(0, Math.ceil((deadline - now) / 1000)); }
export function pickId(ids: number[], random = Math.random) { if (!ids.length) throw new Error('Choose at least one generation.'); return ids[Math.min(ids.length - 1, Math.floor(random() * ids.length))]; }
export function shareLink(mode: Mode, id: number, day: string, href: string) { const url = new URL(href); url.search = ''; url.hash = ''; url.searchParams.set(mode === 'daily' ? 'daily' : 'pokemon', mode === 'daily' ? day : String(id)); return url.toString(); }
export function verdict(inkPixels: number, total: number) {
  const coverage = inkPixels / total;
  if (coverage < 0.0001) return {stars: 0, title: 'A wild invisible Pokémon appeared.', comment: 'Oak checked the page twice. There is still time to make your mark next round.'};
  if (coverage < .008) return {stars: 2, title: 'A minimalist masterpiece.', comment: 'A few brave lines. An enormous amount of implied Pokémon. Oak respects the confidence.'};
  if (coverage > .65) return {stars: 3, title: 'You used FILL. It was super effective.', comment: 'Somewhere in this glorious sea of color, a Pokémon is living its best life.'};
  return {stars: 4, title: 'An exciting new regional form.', comment: 'The resemblance? Debatable. The commitment? Legendary. Professor Oak would put this on his fridge.'};
}
