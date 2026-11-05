import React, {useEffect, useRef, useState} from 'react';
import {Palette, X, Sparkles} from 'lucide-react';
import type {Entity, Project} from '../shared/model';
import type {Action} from '../shared/actions';
import './artwork.css';

type Commit = (actions:Action[],summary:string)=>Promise<unknown>;
const palettes = [['original','#c4f293'],['mint','#7bd5af'],['lavender','#b8a1ed'],['coral','#eea195'],['gold','#edce7c'],['sky','#8cbfe9']] as const;
function ColorField({label,value,fallback,onCommit,disabled}:{label:string;value:string|null;fallback:string;onCommit:(color:string|null)=>void;disabled:boolean}) {
  const [draft,setDraft]=useState(value||fallback);
  useEffect(()=>setDraft(value||fallback),[value,fallback]);
  const apply=()=>{if(/^#[0-9a-f]{6}$/i.test(draft) && draft.toLowerCase()!==(value||fallback).toLowerCase())onCommit(draft.toLowerCase());else setDraft(value||fallback);};
  return <div className="art-color-row"><span>{label}</span><input type="color" aria-label={label+' picker'} value={/^#[0-9a-f]{6}$/i.test(draft)?draft:fallback} onChange={event=>setDraft(event.target.value)} onBlur={apply} disabled={disabled}/><input type="text" aria-label={label+' hex'} value={draft} maxLength={7} onChange={event=>setDraft(event.target.value)} onBlur={apply} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}} disabled={disabled} spellCheck={false}/><button type="button" title={'Reset '+label.toLowerCase()} aria-label={'Reset '+label.toLowerCase()} disabled={disabled||value===null} onClick={()=>onCommit(null)}>↺</button></div>;
}
export function EntityArtworkControls({entity,commit,busy}:{entity:Entity;commit:Commit;busy:boolean}) {
  const a=entity.appearance;
  const patch=(appearance:Partial<Entity['appearance']>)=>void commit([{type:'updateEntity',id:entity.id,patch:{appearance}}],`Restyled ${entity.name}`);
  return <details className="entity-artwork"><summary><Palette size={14}/>Appearance <span>Original art, your way</span></summary><div className="entity-artwork-body">
    <span className="art-label">PALETTE</span><div className="art-swatches">{palettes.map(([name,color])=><button type="button" key={name} aria-label={'Appearance palette '+name} aria-pressed={a.palette===name && !a.primaryColor && !a.accentColor} disabled={busy} title={name} style={{'--swatch':color} as React.CSSProperties} onClick={()=>patch({palette:name,primaryColor:null,accentColor:null})}><span/>{name==='original'?'Original':name.charAt(0).toUpperCase()+name.slice(1)}</button>)}</div>
    <div className="art-select-grid">{([['Silhouette','variant',['classic','round','spiky']],['Pattern','pattern',['plain','spots','stripes']],['Accessory','accessory',['none','leaf','crown','scarf']]] as const).map(([label,key,options])=><label key={key}>{label}<select aria-label={'Appearance '+label.toLowerCase()} value={a[key]} disabled={busy} onChange={event=>patch({[key]:event.target.value})}>{options.map(option=><option key={option} value={option}>{option.charAt(0).toUpperCase()+option.slice(1)}</option>)}</select></label>)}</div>
    <ColorField label="Primary color" value={a.primaryColor} fallback={palettes.find(([name])=>name===a.palette)?.[1]||'#c4f293'} disabled={busy} onCommit={color=>patch({primaryColor:color})}/>
    <ColorField label="Accent color" value={a.accentColor} fallback="#f4e6bc" disabled={busy} onCommit={color=>patch({accentColor:color})}/>
    <p className="art-footnote">Looks change. Your hitbox, abilities and current run stay the same.</p>
  </div></details>;
}
const themes=[{id:'garden',name:'Moonlight Garden',note:'Soft moss · quiet wonder',colors:['#a4ccbd','#638b83','#cfdf94'],icon:'✿'},{id:'autumn',name:'Amber Orchard',note:'Copper leaves · honey skies',colors:['#e1b18c','#a56662','#e9b762'],icon:'❧'},{id:'candy',name:'Sugarcloud',note:'Rose skies · peppermint dreams',colors:['#d6b5cc','#a989b4','#f1bad7'],icon:'✧'},{id:'aurora',name:'Aurora Grove',note:'Jewel tones · northern lights',colors:['#668f9e','#466782','#8bdfd0'],icon:'✦'}] as const;
export function ArtDirectionDialog({project,commit,busy,onClose,onAsk}:{project:Project;commit:Commit;busy:boolean;onClose:()=>void;onAsk:(prompt:string)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close();},[]);
  const world=(settings:Partial<Project['world']>,summary:string)=>void commit([{type:'setWorldSettings',settings}],summary);
  return <dialog ref={dialog} className="art-dialog" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}} aria-labelledby="art-heading"><div className="art-dialog-inner">
    <header><div><span className="eyebrow">THE ART OF YOUR WORLD</span><h2 id="art-heading">A different kind of wonder.</h2></div><button type="button" aria-label="Close art direction" onClick={onClose}><X size={18}/></button></header>
    <p className="art-lede">Original palettes, expressive characters, a whole new mood. Change the artwork while keeping your level and mechanics.</p>
    <div className="theme-grid">{themes.map(theme=><button type="button" className={'theme-card theme-'+theme.id} key={theme.id} aria-pressed={project.world.theme===theme.id} disabled={busy} onClick={()=>world({theme:theme.id},`Art direction: ${theme.name}`)}><div className="theme-landscape" style={{'--sky':theme.colors[0],'--hill':theme.colors[1],'--leaf':theme.colors[2]} as React.CSSProperties}><i/><b/ ><span>{theme.icon}</span><em>◕</em></div><strong>{theme.name}</strong><small>{theme.note}</small>{project.world.theme===theme.id&&<span className="theme-check">✓</span>}</button>)}</div>
    <div className="world-art-fields"><label>Terrain finish<select aria-label="Terrain finish" value={project.world.terrainStyle} disabled={busy} onChange={event=>world({terrainStyle:event.target.value as Project['world']['terrainStyle']},'Changed terrain artwork')}>{['moss','stone','crystal'].map(value=><option key={value} value={value}>{value.charAt(0).toUpperCase()+value.slice(1)}</option>)}</select></label><label>Light<select aria-label="World light" value={project.world.atmosphere} disabled={busy} onChange={event=>world({atmosphere:event.target.value as 'day'|'moonlight'},'Changed world lighting')}><option value="day">Daydream</option><option value="moonlight">Moonlight</option></select></label></div>
    <div className="world-art-fields">{(['foliageDensity','starDensity'] as const).map(key=><label key={key}>{key==='foliageDensity'?'Foliage':'Starlight'}<select aria-label={key==='foliageDensity'?'Foliage density':'Star density'} value={project.world[key]} disabled={busy} onChange={event=>world({[key]:Number(event.target.value)},'Changed decorative density')}><option value={0}>Quiet · none</option><option value={0.35}>A little</option><option value={0.7}>Lush</option><option value={1}>Abundant</option>{![0,.35,.7,1].includes(project.world[key])&&<option value={project.world[key]}>{Math.round(project.world[key]*100)}%</option>}</select></label>)}</div>
    <div className="art-agent-invite"><Sparkles size={18}/><p>Try a creative direction.<small>“Make Pip lavender with a scarf, and give the garden an autumn moonlight palette. Preserve the platforms and rules.”</small></p><button type="button" onClick={()=>{onClose();onAsk('Make Pip lavender with a scarf and spots. Give the world an autumn theme with moonlight and crystal terrain. Preserve every platform, position and gameplay rule.');}}>Try with AI</button></div>
    <footer><span>Procedural original artwork · no generated images</span><button type="button" className="primary" onClick={onClose}>Back to my world</button></footer>
  </div></dialog>;
}
