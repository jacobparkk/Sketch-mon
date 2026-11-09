import type { Pokemon } from './game';
const cache = new Map<string, unknown>();
async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const response = await fetch(`https://pokeapi.co/api/v2/${path}`, {signal});
  if (!response.ok) throw new Error(`Pokédex unavailable (${response.status}). Please try again.`);
  const data: T = await response.json(); cache.set(path, data); return data;
}
export async function generationPool(gens: number[], signal: AbortSignal) {
  const results = await Promise.all(gens.map(g => get<{pokemon_species: {url: string}[]}>(`generation/${g}`, signal)));
  return [...new Set(results.flatMap(g => g.pokemon_species.map(p => Number(p.url.match(/\/(\d+)\/$/)?.[1])).filter(Number.isFinite)))].sort((a,b) => a-b);
}
export async function getPokemon(id: number, signal: AbortSignal): Promise<Pokemon> {
  const data = await get<{id: number; name: string; types: {slot: number; type: {name: string}}[]; sprites: {front_default: string | null; other?: {'official-artwork'?: {front_default: string | null}; home?: {front_default: string | null}}}}>(`pokemon/${id}`, signal);
  return {id: data.id, name: data.name.replaceAll('-', ' '), types: [...data.types].sort((a,b) => a.slot-b.slot).map(t => t.type.name), images: [...new Set([data.sprites.other?.['official-artwork']?.front_default, data.sprites.other?.home?.front_default, data.sprites.front_default].filter((v): v is string => !!v))]};
}
