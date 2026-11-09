import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const expect = (value: unknown) => ({
  toBe: (other: unknown) => assert.equal(value, other),
  toBeGreaterThanOrEqual: (other: number) => assert.ok(typeof value === 'number' && value >= other),
  toBeLessThanOrEqual: (other: number) => assert.ok(typeof value === 'number' && value <= other),
  toThrow: () => assert.throws(value as () => void),
});
import { dailyId, validDay, remaining, pickId, shareLink, verdict } from '../src/game.ts';
describe('challenge selection',()=>{
  it('keeps daily IDs deterministic and within all nine generations',()=>{
    expect(dailyId('2026-11-09')).toBe(dailyId('2026-11-09'));
    for(let i=0;i<5000;i++){const id=dailyId(new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10));expect(id).toBeGreaterThanOrEqual(1);expect(id).toBeLessThanOrEqual(1025);}
  });
  it('validates shared dates and rejects impossible dates',()=>{expect(validDay('2026-02-30')).toBe(false);expect(validDay('garbage')).toBe(false);expect(validDay('2028-02-29')).toBe(true);});
  it('chooses only from selected generation pool and rejects empty pools',()=>{expect(pickId([152,251],()=>0)).toBe(152);expect(pickId([152,251],()=>.999)).toBe(251);expect(()=>pickId([])).toThrow();});
});
describe('round and sharing',()=>{
  it('expires even after long tab suspension',()=>{expect(remaining(60000,0)).toBe(60);expect(remaining(60000,59999)).toBe(1);expect(remaining(60000,120000)).toBe(0);});
  it('preserves deployment path while replacing stale challenges',()=>{expect(shareLink('daily',25,'2026-11-09','https://example.com/game/?pokemon=1#x')).toBe('https://example.com/game/?daily=2026-11-09');expect(shareLink('random',25,'2026-11-09','https://example.com/game/')).toBe('https://example.com/game/?pokemon=25');});
  it('does not reward a blank or white-only page',()=>{expect(verdict(0,1000000).stars).toBe(0);expect(verdict(100000,1000000).stars).toBe(4);expect(verdict(900000,1000000).stars).toBe(3);});
});
