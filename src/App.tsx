import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Pencil, Sparkles, Timer, Shuffle, CalendarDays, Copy, Check, Download, RefreshCw, Star } from 'lucide-react';
import { DrawingPad } from './components/DrawingPad';
import type { Drawing, PadHandle } from './components/DrawingPad';
import { Doodles } from './components/Doodles';
import { generationPool, getPokemon } from './api';
import { GENERATIONS, ROUND_MS, dailyId, pickId, remaining, shareLink, utcDay, validDay, verdict } from './game';
import type { Mode, Pokemon } from './game';

type Phase = 'setup' | 'loading' | 'drawing' | 'reveal';
function initialChallenge() {
  const query = new URLSearchParams(window.location.search), date = query.get('daily'), id=Number(query.get('pokemon'));
  return {mode: (validDay(date) ? 'daily' : 'random') as Mode, day: validDay(date) ? date : utcDay(), id: Number.isInteger(id) && id>=1 && id<=1025 ? id : null};
}
function Artwork({pokemon}: {pokemon: Pokemon}) {
  const [index,setIndex]=useState(0);
  return index < pokemon.images.length ? <img className="official-art" src={pokemon.images[index]} alt={`Official artwork of ${pokemon.name}`} onError={()=>setIndex(i=>i+1)}/> : <div className="art-missing"><Sparkles size={44}/><strong>Camera-shy Pokémon</strong><span>Artwork couldn’t load. Your drawing is safe.</span><button className="text-button" onClick={()=>setIndex(0)}>Retry artwork</button></div>;
}
export default function App() {
  const [challenge] = useState(initialChallenge);
  const [mode,setMode]=useState<Mode>(challenge.mode);
  const [gens,setGens]=useState([1]);
  const [phase,setPhase]=useState<Phase>('setup');
  const [pokemon,setPokemon]=useState<Pokemon|null>(null);
  const [day,setDay]=useState(challenge.day);
  const [sharedId,setSharedId]=useState(challenge.id);
  const [deadline,setDeadline]=useState(0);
  const [seconds,setSeconds]=useState(60);
  const [drawing,setDrawing]=useState<Drawing|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  const [manualCopy,setManualCopy]=useState(false);
  const pad=useRef<PadHandle>(null);
  const phaseRef=useRef<Phase>('setup');
  const request=useRef<AbortController|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  function transition(next: Phase) { phaseRef.current=next;setPhase(next); }
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{heading.current?.focus();},[phase]);
  const finish=useCallback(()=>{
    if(phaseRef.current!=='drawing' || !pad.current)return;
    phaseRef.current='reveal';
    setDrawing(pad.current.snapshot());
    setElapsed(Math.max(0,Math.min(60,Math.ceil((Date.now()-(deadline-ROUND_MS))/1000))));
    setPhase('reveal');
  },[deadline]);
  useEffect(()=>{
    if(phase!=='drawing')return;
    const tick=()=>{const left=remaining(deadline,Date.now());setSeconds(left);if(!left)finish();};
    tick();const timer=window.setInterval(tick,100);document.addEventListener('visibilitychange',tick);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[phase,deadline,finish]);
  async function start() {
    if(phaseRef.current==='loading' || phaseRef.current==='drawing')return;
    if(mode==='random' && !sharedId && !gens.length){setError('Choose at least one generation to start.');return;}
    setError('');setCopied(false);setManualCopy(false);transition('loading');
    request.current?.abort(); const controller=new AbortController();request.current=controller;
    const timeout=window.setTimeout(()=>controller.abort(),15000);
    try {
      const id = mode==='daily' ? dailyId(day) : sharedId ?? pickId(await generationPool(gens,controller.signal));
      const next=await getPokemon(id,controller.signal);
      if(controller.signal.aborted)return;
      setPokemon(next);setDrawing(null);setDeadline(Date.now()+ROUND_MS);setSeconds(60);transition('drawing');
    } catch(e) {
      if(request.current!==controller)return;
      setError(controller.signal.aborted ? 'The Pokédex took too long to respond. Check your connection and try again.' : e instanceof Error ? e.message : 'Could not load a Pokémon. Please try again.');transition('setup');
    } finally {clearTimeout(timeout);}
  }
  function reset() {request.current?.abort();request.current=null;setSharedId(null);setDay(utcDay());setError('');transition('setup');window.history.replaceState({},'',window.location.pathname);}
  const result=drawing ? verdict(drawing.inkPixels,drawing.total) : null;
  const shareText=pokemon && result ? `✏️ SKETCH-MON ${mode==='daily' ? `· Daily ${day}` : '· Memory challenge'}\n${pokemon.name.toUpperCase()} #${String(pokemon.id).padStart(3,'0')}\n${'⭐'.repeat(result.stars)}${'☆'.repeat(5-result.stars)} · Just-for-fun creativity rating\n⏱ ${elapsed}s / 60s · No peeking!\n“${result.title}”\nCan you draw it from memory?\n${shareLink(mode,pokemon.id,day,window.location.href)}` : '';
  async function copy() {try {await navigator.clipboard.writeText(shareText);setCopied(true);setManualCopy(false);}catch{setManualCopy(true);}}
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href={window.location.pathname} aria-label="Sketch-Mon home"><span className="brand-icon"><Pencil size={21}/></span>sketch<span className="brand-dash">–</span>mon<span className="brand-period">.</span></a><span className="header-caption">LESS PERFECT. MORE POKÉMON.</span><a className="how-link" href="#how-it-works">How to play <span>↗</span></a></header>
    <main>
    {(phase==='setup' || phase==='loading') && <>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="status-dot"/> THE POKÉMON MEMORY CHALLENGE</div><h1 ref={heading} tabIndex={-1}>You know the name.<br/>But can you <span className="draw-word">draw it?<svg viewBox="0 0 360 18" preserveAspectRatio="none"><path d="M4 11Q143-5 354 8M22 17Q172 5 328 14"/></svg></span></h1><p>One Pokémon. One minute. No peeking.<br/>Put your memory to the test. Artistic talent optional.</p><div className="hero-pills"><span><Timer size={15}/> 60 seconds</span><span><Pencil size={15}/> Pure memory</span><span><Sparkles size={15}/> Beautiful chaos</span></div></div><Doodles/></section>
      <section className="setup-card" aria-label="Game setup"><div className="setup-heading"><div><span className="mini-label">YOUR NEXT MASTERPIECE STARTS HERE</span><h2>Pick your challenge<span>.</span></h2></div><div className="mode-toggle"><button disabled={phase==='loading'} aria-pressed={mode==='random'} onClick={()=>{setMode('random');setSharedId(null);}} className={mode==='random'?'active':''}><Shuffle size={16}/> Random</button><button disabled={phase==='loading'} aria-pressed={mode==='daily'} onClick={()=>{setMode('daily');setSharedId(null);}} className={mode==='daily'?'active':''}><CalendarDays size={16}/> Daily challenge</button></div></div>
        {mode==='random' && !sharedId ? <><div className="generation-heading"><p>Which generations do you remember?</p><label className="all-check"><input type="checkbox" checked={gens.length===9} disabled={phase==='loading'} onChange={e=>setGens(e.target.checked?[1,2,3,4,5,6,7,8,9]:[])}/> Select all</label></div><div className="generation-grid">{GENERATIONS.map(([region],i)=><label key={region} className={`generation ${gens.includes(i+1)?'chosen':''}`}><input type="checkbox" disabled={phase==='loading'} checked={gens.includes(i+1)} onChange={e=>setGens(g=>e.target.checked?[...g,i+1]:g.filter(n=>n!==i+1))}/><span className="gen-num">GEN {i+1}</span><strong>{region}</strong><span className="checkbox-mark">{gens.includes(i+1)&&<Check size={12}/>}</span></label>)}</div></> : <div className="daily-info"><CalendarDays size={30}/><div><strong>{sharedId && mode==='random' ? 'A friend challenged your memory.' : `Your daily doodle · ${day}`}</strong><p>{sharedId && mode==='random' ? 'Same Pokémon. Your interpretation. No spoilers until you start.' : 'One mystery Pokémon for everyone. All nine generations. Resets at midnight UTC.'}</p></div></div>}
        <div className="setup-bottom"><span><span className="little-star">✳</span> Bad drawings make the best stories.</span><button className="primary-button" onClick={start} disabled={phase==='loading' || (mode==='random' && !sharedId && !gens.length)}>{phase==='loading'?<><RefreshCw size={19} className="spin"/> Opening the Pokédex…</>:<>Let’s sketch <ArrowRight size={20}/></>}</button></div>
        {mode==='random' && !sharedId && !gens.length && <p className="hint">Select a generation to start.</p>}{error && <p className="error" role="alert">{error}</p>}
      </section>
    </>}
    {phase==='drawing' && pokemon && <section className="play-section"><div className="round-heading"><div><span className="mini-label">{mode==='daily'?`DAILY CHALLENGE · ${day}`:'YOUR MEMORY. YOUR MASTERPIECE.'}</span><h1 ref={heading} tabIndex={-1} className="pokemon-name">Draw {pokemon.name}<span>.</span></h1><div className="flex flex-wrap items-center gap-2"><span className="muted text-sm">From memory, of course.</span>{pokemon.types.map(t=><span className={`type-badge type-${t}`} key={t}>{t}</span>)}</div></div><div className={`timer ${seconds<=10?'urgent':''}`} role="timer" aria-label={`${seconds} seconds remaining`}><Timer size={22}/><strong>{String(seconds).padStart(2,'0')}</strong><span>SECONDS</span></div></div><div className="time-track"><div style={{width:`${seconds/60*100}%`}}/></div><DrawingPad ref={pad} deadline={deadline} locked={false}/><div className="drawing-bottom"><span><Sparkles size={17}/> Trust the process. Even if it has three legs.</span><button className="primary-button" onClick={finish}>Submit early <ArrowRight size={19}/></button></div></section>}
    {phase==='reveal' && pokemon && drawing && result && <section className="reveal-section"><div className="reveal-heading"><span className="eyebrow">THE MOMENT OF TRUTH</span><h1 ref={heading} tabIndex={-1}>Memory meets <span>reality.</span></h1><p><span className="capitalize">{pokemon.name}</span> · #{String(pokemon.id).padStart(3,'0')} · Sketched in {elapsed}s</p></div><div className="comparison"><article className="comparison-card"><div className="comparison-label"><span><Pencil size={16}/> Your masterpiece</span><span>100% YOU</span></div><img src={drawing.url} alt={`Your memory drawing of ${pokemon.name}`}/></article><span className="versus">vs.</span><article className="comparison-card official"><div className="comparison-label"><span><Sparkles size={16}/> The inspiration</span><span>OFFICIAL ART</span></div><div className="art-frame"><Artwork key={pokemon.id} pokemon={pokemon}/></div></article></div><div className="verdict-card"><div className="verdict-icon">✦</div><div><span className="mini-label">PROFESSOR OAK’S VERY UNOFFICIAL VERDICT</span><h2>{result.title}</h2><p>{result.comment}</p><div className="rating"><span>{Array.from({length:5},(_,i)=><Star key={i} size={17} fill={i<result.stars?'currentColor':'none'}/>)}</span> Just-for-fun creativity rating</div><small>Based on ink coverage, not visual similarity. No AI or accuracy measurement.</small></div></div><div className="result-actions"><button className="secondary-button" onClick={reset}><ArrowLeft size={17}/> New challenge</button><a className="secondary-button" download={`sketch-mon-${pokemon.name.replaceAll(' ','-')}.png`} href={drawing.url}><Download size={17}/> Save drawing</a><button className="primary-button" onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'Copied!':'Copy scorecard'}</button></div><div role="status" className="sr-only">{copied?'Scorecard copied to clipboard.':''}</div>{manualCopy && <div className="copy-fallback"><label htmlFor="scorecard">Clipboard access is unavailable. Select and copy your scorecard below.</label><textarea id="scorecard" readOnly value={shareText} onFocus={e=>e.target.select()}/></div>}</section>}
    <section className="how-section" id="how-it-works"><div className="how-title"><span className="mini-label">A VERY SIMPLE FORMULA</span><h2>No skills. Just vibes.</h2></div><div className="how-steps"><div><span className="step-number">01</span><div><strong>Meet your mystery mon</strong><p>A name and its types. That’s your clue.</p></div></div><div><span className="step-number">02</span><div><strong>Make a little mess</strong><p>You have 60 seconds to draw from memory.</p></div></div><div><span className="step-number">03</span><div><strong>Reveal. Laugh. Repeat.</strong><p>Compare your creation and challenge a friend.</p></div></div></div></section>
    </main><footer><span>Made for the love of Pokémon & questionable art.</span><span>Unofficial fan game · Data & art via <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokéAPI ↗</a></span><small>Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak, and Creatures.</small></footer>
  </div>;
}
