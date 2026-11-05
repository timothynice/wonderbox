import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Hand, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { mountGame, type GameStatus } from '../game/index.js';
import { projectSchema, type Project } from '../shared/model.js';
import './phone.css';
type Snapshot={project:Project;version:number;expiresAt:number};
type TouchKey='left'|'right'|'jump';
export function PhonePlayer({shareId}: {shareId:string}) {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[pending,setPending]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(true),[paused,setPaused]=useState(false),[muted,setMuted]=useState(false),[status,setStatus]=useState<GameStatus|null>(null);
  const host=useRef<HTMLDivElement>(null),game=useRef<ReturnType<typeof mountGame>|null>(null),version=useRef(0),pointerKeys=useRef(new Map<number,TouchKey>()),alive=useRef(true),request=useRef<AbortController|null>(null);
  const release=useCallback(()=>{pointerKeys.current.clear();game.current?.releaseTouchInput();},[]);
  const load=useCallback(async()=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError('');
    try {
      const response=await fetch(`/api/share/${encodeURIComponent(shareId)}`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});const body=await response.json();
      if(!response.ok)throw Error(body.error||'This world could not be opened.');
      const project=projectSchema.parse(body.project);if(!Number.isInteger(body.version)||body.version<1)throw Error('This play version is invalid. Ask the creator to send it again.');
      if(alive.current&&body.version>=version.current){release();version.current=body.version;setSnapshot({project,version:body.version,expiresAt:body.expiresAt});setPending(0);setPaused(false);setStatus(null);}
    }catch(failure){if(alive.current&&!controller.signal.aborted)setError(failure instanceof Error?failure.message:'Could not connect to this world.');}
    finally{if(alive.current&&request.current===controller)setLoading(false);}
  },[shareId,release]);
  useEffect(()=>{alive.current=true;version.current=0;setSnapshot(null);setPending(0);void load();return()=>{alive.current=false;request.current?.abort();};},[load]);
  useEffect(()=>{
    if(!snapshot||!host.current)return;
    const instance=mountGame(host.current,snapshot.project,{onStatus:setStatus,onPause:()=>{setPaused(true);release();instance.setMode('edit');}});game.current=instance;instance.setMuted(muted);
    const observer={getProject:()=>structuredClone(snapshot.project),getDebugState:()=>instance.getDebugState(),getVersion:()=>snapshot.version};
    (window as any).__wonderboxPhone=observer;
    return()=>{if((window as any).__wonderboxPhone===observer)delete (window as any).__wonderboxPhone;release();instance.destroy();if(game.current===instance)game.current=null;};
    // A new snapshot is mounted only after an explicit version restart.
  },[snapshot]);
  useEffect(()=>{game.current?.setMode(paused?'edit':'play');if(paused)release();},[paused,release]);
  useEffect(()=>{game.current?.setMuted(muted);},[muted]);
  useEffect(()=>{
    let live=true,busy=false;const controller=new AbortController();
    async function poll(){
      if(!live||busy||!version.current||document.hidden)return;busy=true;
      try{
        const response=await fetch(`/api/share/${encodeURIComponent(shareId)}?meta=1`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});const body=await response.json();
        if(!response.ok)throw Error(body.error||'Could not check for new versions.');
        if(live)setError(current=>current.endsWith('Your current run can continue.')?'':current);
        if(live&&Number.isInteger(body.version)&&body.version>version.current)setPending(current=>Math.max(current,body.version));
      }catch(failure){if(live&&!controller.signal.aborted)setError(failure instanceof Error?`${failure.message} Your current run can continue.`:'Connection lost. Your current run can continue.');}
      finally{busy=false;}
    }
    const interval=setInterval(()=>void poll(),5000);const visible=()=>{release();if(!document.hidden)void poll();};
    document.addEventListener('visibilitychange',visible);window.addEventListener('blur',release);
    return()=>{live=false;controller.abort();clearInterval(interval);document.removeEventListener('visibilitychange',visible);window.removeEventListener('blur',release);};
  },[shareId,release]);
  function sync(){const values=[...pointerKeys.current.values()];game.current?.setTouchInput({left:values.includes('left'),right:values.includes('right'),jump:values.includes('jump')});}
  function touchStart(event:React.PointerEvent<HTMLButtonElement>,key:TouchKey){event.preventDefault();if(paused)return;event.currentTarget.setPointerCapture(event.pointerId);pointerKeys.current.set(event.pointerId,key);sync();}
  function touchEnd(event:React.PointerEvent<HTMLButtonElement>){pointerKeys.current.delete(event.pointerId);sync();}
  function control(key:TouchKey,label:string,icon:React.ReactNode){return <button className={`phone-touch phone-touch-${key}`} aria-label={label} onPointerDown={event=>touchStart(event,key)} onPointerUp={touchEnd} onPointerCancel={touchEnd} onLostPointerCapture={touchEnd} disabled={paused||!snapshot}>{icon}<span>{label}</span></button>;}
  return <main className="phone-player">
    <header className="phone-header"><a href="/" aria-label="Open Wonderbox editor" className="phone-brand">w<span>✦</span></a><div><strong>{snapshot?.project.name??'A little world awaits'}</strong><small>{snapshot?`PLAY VERSION ${snapshot.version}`:'WONDERBOX · PLAY'}</small></div><button aria-label={muted?'Unmute game':'Mute game'} onClick={()=>setMuted(value=>!value)}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button aria-label="Full screen" onClick={()=>{const result=document.documentElement.requestFullscreen?.();result?.catch(()=>setError('Full screen is unavailable here. Rotate your phone for a wider view.'));}}><Maximize size={18}/></button></header>
    {pending>0&&<div className="phone-update" role="status"><span>✦ New version ready <small>Your current run is unchanged.</small></span><button disabled={loading} onClick={()=>void load()}>{loading?'Opening…':'Restart with latest'}</button></div>}
    {error&&<div className="phone-error" role="alert">{error}{!snapshot&&<button onClick={()=>void load()} disabled={loading}>Try again</button>}{snapshot&&<button aria-label="Dismiss connection message" onClick={()=>setError('')}>×</button>}</div>}
    <div className="phone-stage" ref={host} aria-label="Playable shared level">
      {!snapshot&&<div className="phone-loading"><span>✦</span><h1>{loading?'Opening your little world…':'This world needs a new link.'}</h1><p>{loading?'A wish, a jump, a possibility.':'Ask its creator to share it again.'}</p></div>}
      {snapshot&&paused&&<div className="phone-paused"><button onClick={()=>setPaused(false)}><Play size={25}/>Keep playing</button><p>Your world is paused.</p></div>}
      {status?.won&&<div className="phone-victory"><span>✦</span><h1>A wish well played.</h1><p>You found every star. What will you make next?</p><button onClick={()=>{release();game.current?.restart();setPaused(false);}}><RotateCcw size={17}/>Play again</button></div>}
    </div>
    <div className="phone-controls">
      <div className="phone-directions">{control('left','Move left',<ArrowLeft size={27}/>)}{control('right','Move right',<ArrowRight size={27}/>)}</div>
      <div className="phone-middle"><button aria-label={paused?'Resume game':'Pause game'} disabled={!snapshot} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={18}/>:<Pause size={18}/>}</button><button aria-label="Restart shared level" disabled={!snapshot} onClick={()=>{release();game.current?.restart();setPaused(false);}}><RotateCcw size={18}/></button></div>
      <div className="phone-actions"><button className="phone-touch phone-touch-interact" aria-label="Pick up or throw" onPointerDown={event=>{event.preventDefault();if(!paused)game.current?.touchInteract();}} disabled={paused||!snapshot}><Hand size={23}/><span>Pick / throw</span></button>{control('jump','Jump',<ArrowUp size={28}/>)}</div>
    </div>
    <footer className="phone-footer"><span>Hold jump to soar · landscape gives you more room</span><span>Imagine it. Make it. Play it.</span></footer>
  </main>;
}
