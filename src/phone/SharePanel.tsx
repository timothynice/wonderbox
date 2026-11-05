import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, RefreshCw, Smartphone, X } from 'lucide-react';
import type { Project } from '../shared/model.js';
import './phone.css';

type Owner = { id: string; writeToken: string; version: number; projectRevision: number; expiresAt: number };
const ownerKey = (projectId: string) => `wonderbox.share-owner.${projectId}`;
function storedOwner(projectId: string): Owner | null {
  try {
    const value = JSON.parse(localStorage.getItem(ownerKey(projectId)) || 'null');
    return value && /^[a-f0-9]{40}$/.test(value.id) && /^[A-Za-z0-9_-]{43}$/.test(value.writeToken) && Number.isInteger(value.version) && value.expiresAt > Date.now() ? value : null;
  } catch { return null; }
}
export function SharePanel({project,onClose}: {project: Project; onClose: () => void}) {
  const [owner,setOwner] = useState<Owner | null>(() => storedOwner(project.id));
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState(''), [qr,setQr] = useState('');
  const dialog = useRef<HTMLDivElement>(null), mounted = useRef(true);
  const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const url = owner ? `${location.origin}/play/${owner.id}` : '';
  const dirty = owner && owner.projectRevision !== project.revision;
  useEffect(() => {
    mounted.current = true; const previous = document.activeElement;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {mounted.current = false; if (previous instanceof HTMLElement) previous.focus();};
  }, []);
  useEffect(() => {
    let live = true; setQr('');
    if (url) QRCode.toDataURL(url,{width:240,margin:2,errorCorrectionLevel:'M',color:{dark:'#19382e',light:'#ffffff'}}).then(value=>{if(live)setQr(value);}).catch(()=>{if(live)setError('QR code could not be drawn. The play link still works.');});
    return () => {live=false;};
  }, [url]);
  useEffect(() => {
    if (!owner) return;
    const abort = new AbortController();
    fetch(`/api/share/${owner.id}?meta=1`,{signal:abort.signal,cache:'no-store'}).then(async response=>{
      if (response.status===404) {setOwner(null);localStorage.removeItem(ownerKey(project.id));setNotice('Your previous play link expired or was revoked. Create a new one.');return;}
      if (!response.ok) return;
      const meta=await response.json();
      setOwner(current=>current?.id===owner.id && Number.isInteger(meta.version) && meta.version >= current.version ? {...current,version:meta.version,projectRevision:meta.projectRevision,expiresAt:meta.expiresAt} : current);
    }).catch(()=>{});
    return()=>abort.abort();
    // Refresh once when this project’s dialog opens, not on each sent version.
  }, [project.id]);
  async function send() {
    if (busy) return; setBusy(true);setError('');setNotice('');
    const snapshot=structuredClone(project), previous=owner;
    try {
      const response=await fetch(previous?`/api/share/${previous.id}`:'/api/share',{
        method:previous?'PUT':'POST',headers:{'Content-Type':'application/json',...(previous?{Authorization:`Bearer ${previous.writeToken}`}:{})},
        body:JSON.stringify({project:snapshot,...(previous?{expectedVersion:previous.version}:{})}),signal:AbortSignal.timeout(20000),
      });
      const result=await response.json();if(!response.ok)throw Error(result.error||'Could not send this version. Nothing changed in your editor.');
      const next: Owner={...result,writeToken:previous?.writeToken??result.writeToken};
      try {localStorage.setItem(ownerKey(snapshot.id),JSON.stringify(next));}catch{if(mounted.current)setNotice('Link created. This browser cannot retain its update permission after closing this panel.');}
      if(mounted.current){setOwner(next);setNotice(`Version ${next.version} is ready. Phones already playing will be offered a restart; their current run stays intact.`);}
    } catch (failure) {if(mounted.current)setError(failure instanceof Error?failure.message:'Sharing could not finish. Please try again.');}
    finally {if(mounted.current)setBusy(false);}
  }
  async function revoke() {
    if(!owner||busy)return;setBusy(true);setError('');
    try {
      const response=await fetch(`/api/share/${owner.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${owner.writeToken}`},signal:AbortSignal.timeout(20000)});
      if(!response.ok){const body=await response.json();throw Error(body.error||'Could not revoke this link.');}
      localStorage.removeItem(ownerKey(project.id));if(mounted.current){setOwner(null);setNotice('Play link revoked. Previously loaded copies cannot be recalled.');}
    }catch(failure){if(mounted.current)setError(failure instanceof Error?failure.message:'Please try again.');}
    finally{if(mounted.current)setBusy(false);}
  }
  function keyDown(event: React.KeyboardEvent) {
    if(event.key==='Escape'){event.stopPropagation();event.preventDefault();if(!busy)onClose();}
    if(event.key==='Tab'){
      const items=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input')];
      const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }
  return <div className="share-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" ref={dialog} onKeyDown={keyDown}>
      <button className="share-close" aria-label="Close phone sharing" onClick={onClose} disabled={busy}><X size={19}/></button>
      <div className="share-eyebrow"><Smartphone size={15}/> TAKE YOUR WORLD WITH YOU</div>
      <h2 id="share-title">Little world. Bigger possibilities.</h2>
      <p>Scan, play, reshape. Send a new version when you’re ready—your phone chooses when to restart.</p>
      {local&&<div className="share-local-note">You’re editing on localhost. These links work on this computer only. For a real phone, open <a href="https://wonderbox-three.vercel.app" target="_blank" rel="noreferrer">the hosted editor</a> and import your exported level, or use a reachable LAN address.</div>}
      {owner?<>
        <div className="share-code">{qr?<img src={qr} alt={`QR code to play ${project.name}`} width="240" height="240"/>:<span>Preparing QR…</span>}</div>
        <label className="share-link-label">Play link · anyone with this link can play<input aria-label="Phone play link" readOnly value={url} onFocus={event=>event.target.select()}/></label>
        <div className="share-link-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setNotice('Play link copied.');}catch{setNotice('Select the play link above and copy it.');}}}><Copy size={14}/>Copy link</button><a href={url} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open player</a></div>
        <div className="share-version"><span>Sent v{owner.version} · editor r{owner.projectRevision}</span><span>{dirty?'New edits ready to send':'Up to date'}</span></div>
        <button className="share-primary" onClick={()=>void send()} disabled={busy||!dirty}><RefreshCw size={15}/>{busy?'Sending…':'Send latest version'}</button>
        <div className="share-fine">Expires {new Date(owner.expiresAt).toLocaleDateString()}. The link contains a playable copy of your level, not your editor or AI access.</div>
        <button className="share-revoke" onClick={()=>void revoke()} disabled={busy}>Revoke play link</button>
      </>:<><div className="share-illustration"><Smartphone size={58}/><span>YOUR WORLD, IN THEIR HANDS</span></div><button className="share-primary" onClick={()=>void send()} disabled={busy}>{busy?'Creating play link…':'Create play link & QR code'}</button><div className="share-fine">Unlisted link · no account needed · expires after 7 days. Updates require this browser’s private permission.</div></>}
      {notice&&<p className="share-notice" role="status">{notice}</p>}{error&&<p className="share-error" role="alert">{error}</p>}
    </div>
  </div>;
}
