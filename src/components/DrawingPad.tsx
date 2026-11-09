import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Eraser, Pencil, Undo2, Trash2 } from 'lucide-react';
export type Drawing = {url: string; inkPixels: number; total: number};
export type PadHandle = {snapshot: () => Drawing};
const SIZE = 1000;
const COLORS = ['#272631', '#ffffff', '#f5cd58', '#ee865f', '#e8789c', '#a896db', '#6babe0', '#78b894', '#986746'];
export const DrawingPad = forwardRef<PadHandle, {deadline: number; locked: boolean}>(function DrawingPad({deadline, locked}, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<{id: number; x: number; y: number} | null>(null);
  const history = useRef<ImageData[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(9);
  const [erase, setErase] = useState(false);
  const allowed = () => !locked && Date.now() < deadline;
  function backup() {
    const ctx = canvas.current!.getContext('2d')!;
    history.current.push(ctx.getImageData(0,0,SIZE,SIZE));
    if (history.current.length > 20) history.current.shift();
    setUndoCount(history.current.length);
  }
  useImperativeHandle(ref, () => ({ snapshot() {
    active.current = null;
    const source = canvas.current!;
    const data = source.getContext('2d')!.getImageData(0,0,SIZE,SIZE).data;
    let inkPixels = 0;
    for (let i=0;i<data.length;i+=4) if (data[i+3] > 20 && (data[i] < 240 || data[i+1] < 240 || data[i+2] < 240)) inkPixels++;
    const output = document.createElement('canvas'); output.width=SIZE; output.height=SIZE;
    const ctx = output.getContext('2d')!; ctx.fillStyle='#fff'; ctx.fillRect(0,0,SIZE,SIZE); ctx.drawImage(source,0,0);
    return {url: output.toDataURL('image/png'), inkPixels, total: SIZE*SIZE};
  }}));
  function point(e: PointerEvent<HTMLCanvasElement>) { const rect = e.currentTarget.getBoundingClientRect(); return {x: (e.clientX-rect.left)*SIZE/rect.width, y: (e.clientY-rect.top)*SIZE/rect.height}; }
  function paint(x: number, y: number, px: number, py: number) {
    const ctx = canvas.current!.getContext('2d')!;
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(x,y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,width/2,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }
  function start(e: PointerEvent<HTMLCanvasElement>) { if (!allowed() || active.current || e.button !== 0) return; e.preventDefault(); backup(); const p=point(e); active.current={id:e.pointerId,...p}; e.currentTarget.setPointerCapture(e.pointerId); paint(p.x,p.y,p.x,p.y); }
  function move(e: PointerEvent<HTMLCanvasElement>) { if (!active.current || active.current.id !== e.pointerId) return; if (!allowed()) {active.current=null; return;} const p=point(e); paint(p.x,p.y,active.current.x,active.current.y); active.current={id:e.pointerId,...p}; }
  function stop(e: PointerEvent<HTMLCanvasElement>) { if (active.current?.id === e.pointerId) active.current=null; }
  return <div className="drawing-pad">
    <div className="canvas-wrap"><canvas ref={canvas} width={SIZE} height={SIZE} aria-label="Drawing canvas. Use a mouse, stylus, or finger to draw from memory." onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}/><span className="paper-caption">A LITTLE MEMORY. A LOT OF IMAGINATION.</span></div>
    <fieldset disabled={locked} className="toolbar">
      <div className="flex flex-wrap items-center gap-2"><button type="button" className={`tool ${!erase ? 'selected' : ''}`} aria-label="Brush" aria-pressed={!erase} onClick={()=>setErase(false)}><Pencil size={18}/></button><button type="button" className={`tool ${erase ? 'selected' : ''}`} aria-label="Eraser" aria-pressed={erase} onClick={()=>setErase(true)}><Eraser size={18}/></button><span className="tool-divider"/>{COLORS.map(c=><button type="button" key={c} aria-label={`Color ${c}`} aria-pressed={color===c && !erase} onClick={()=>{setColor(c);setErase(false);}} className={`swatch ${color===c && !erase ? 'active' : ''}`} style={{background:c}}/>)}<label className="custom-color" title="Custom color"><input type="color" aria-label="Custom color" value={color} onChange={e=>{setColor(e.target.value);setErase(false);}}/></label></div>
      <div className="flex items-center justify-between gap-3"><label className="brush-size">Size <input type="range" min="3" max="50" value={width} onChange={e=>setWidth(Number(e.target.value))}/><span>{width}</span></label><div className="flex gap-1"><button type="button" className="tool" aria-label="Undo stroke" disabled={!undoCount} onClick={()=>{if(!allowed())return;active.current=null;canvas.current!.getContext('2d')!.putImageData(history.current.pop()!,0,0);setUndoCount(history.current.length);}}><Undo2 size={18}/></button><button type="button" className="tool" aria-label="Clear canvas" onClick={()=>{if(!allowed())return;active.current=null;backup();canvas.current!.getContext('2d')!.clearRect(0,0,SIZE,SIZE);}}><Trash2 size={18}/></button></div></div>
    </fieldset>
  </div>;
});
