import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generationPool, getPokemon } from '../src/api.ts';
const signal = new AbortController().signal;
describe('PokéAPI client',()=>{
  it('loads only requested generation pools, sorts and deduplicates',async()=>{
    const original = globalThis.fetch; const seen: string[]=[];
    globalThis.fetch = (async (url: string) => {seen.push(url);return new Response(JSON.stringify({pokemon_species:[{url:'https://pokeapi.co/api/v2/pokemon-species/251/'},{url:'https://pokeapi.co/api/v2/pokemon-species/152/'},{url:'https://pokeapi.co/api/v2/pokemon-species/152/'}]}));}) as typeof fetch;
    try {assert.deepEqual(await generationPool([2],signal),[152,251]);assert.deepEqual(seen,['https://pokeapi.co/api/v2/generation/2']);} finally {globalThis.fetch=original;}
  });
  it('normalizes names and type ordering and provides artwork fallbacks',async()=>{
    const original=globalThis.fetch;let calls=0;
    globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({id:122,name:'mr-mime',types:[{slot:2,type:{name:'fairy'}},{slot:1,type:{name:'psychic'}}],sprites:{front_default:'sprite.png',other:{'official-artwork':{front_default:'art.png'},home:{front_default:'home.png'}}}}));}) as typeof fetch;
    try {const pokemon=await getPokemon(122,signal);assert.equal(pokemon.name,'mr mime');assert.deepEqual(pokemon.types,['psychic','fairy']);assert.deepEqual(pokemon.images,['art.png','home.png','sprite.png']);await getPokemon(122,signal);assert.equal(calls,1);}finally{globalThis.fetch=original;}
  });
  it('surfaces API errors and allows retry instead of caching failures',async()=>{
    const original=globalThis.fetch;let calls=0;
    globalThis.fetch=(async()=>{calls++;return new Response('',{status:503});}) as typeof fetch;
    try{await assert.rejects(getPokemon(999,signal),/503/);await assert.rejects(getPokemon(999,signal),/503/);assert.equal(calls,2);}finally{globalThis.fetch=original;}
  });
  it('handles missing images without inventing an artwork URL',async()=>{
    const original=globalThis.fetch;
    globalThis.fetch=(async()=>new Response(JSON.stringify({id:1,name:'bulbasaur',types:[],sprites:{front_default:null}}))) as typeof fetch;
    try{assert.deepEqual((await getPokemon(1,signal)).images,[]);}finally{globalThis.fetch=original;}
  });
});
