import { describe, expect, it } from 'vitest';
import { createStarterProject } from '../src/shared/starter';
import { checkReachability, mechanicsFingerprint, reachabilityEvidenceSchema, replayWitness } from '../src/shared/reachability';
import { createMotionState, stepPlayerMotion } from '../src/shared/movement';
import type { Body } from '../src/game/physics';

describe('production motion static-terrain witnesses', () => {
  it('reports a bounded lack of route without declaring the optional ledge impossible', () => {
    const p=createStarterProject(), before=JSON.stringify(p);
    const r=checkReachability(p,{targetTerrainId:'optional-float-ledge'});
    expect(r.status).toBe('no-route-found');expect(r.passed).toBe(false);
    expect(r.summary).toContain('does not prove');
    expect(r.limits.steps).toBeLessThanOrEqual(r.limits.maxSteps);
    expect(JSON.stringify(p)).toBe(before);
    expect(reachabilityEvidenceSchema.parse(r)).toEqual(r);
  });
  it('finds and exactly replays a multi-hop terrain-only improvement with unchanged player', () => {
    const p=createStarterProject(), player=structuredClone(p.entities[0]);
    p.terrain.push({id:'intermediate-step',x:480,y:420,width:100,height:20});p.revision++;
    const r=checkReachability(p,{targetTerrainId:'optional-float-ledge'});
    expect(r.status).toBe('route-found');expect(r.revision).toBe(1);
    expect(r.witness?.landings).toEqual(['garden-floor','first-step','intermediate-step','optional-float-ledge']);
    const replay=replayWitness(p,r.witness!);
    expect(replay.grounded).toBe(true);expect(replay.y).toBe(264);expect(Math.abs(replay.vx)).toBeLessThan(25);
    expect(replay.x).toBeGreaterThanOrEqual(300);expect(replay.x+replay.width).toBeLessThanOrEqual(450);
    expect(p.entities[0]).toEqual(player);
    expect(reachabilityEvidenceSchema.parse(r)).toEqual(r);
  });
  it('rejects an overhead step arrangement rather than relying only on jump-height arithmetic', () => {
    const p=createStarterProject();p.terrain.push({id:'bad-step',x:540,y:400,width:100,height:20});
    const r=checkReachability(p,{targetTerrainId:'optional-float-ledge'});
    expect(r.status).toBe('no-route-found');expect(r.witness).toBeUndefined();
  });
  it('uses changed production float mechanics and revision/fingerprint bindings', () => {
    const p=createStarterProject(), old=mechanicsFingerprint(p);
    p.entities[0].behaviors.floatSeconds=.8;p.revision=7;
    const r=checkReachability(p,{targetTerrainId:'optional-float-ledge'});
    expect(r.status).toBe('route-found');expect(r.revision).toBe(7);expect(r.mechanicsFingerprint).not.toBe(old);
    expect(replayWitness(p,r.witness!).y).toBe(264);
    const changedTerrain=structuredClone(p);changedTerrain.terrain[1].x++;
    expect(mechanicsFingerprint(changedTerrain)).not.toBe(r.mechanicsFingerprint);
  });
  it('does not silently certify routes with dynamic interference or invalid starting geometry', () => {
    const p=createStarterProject();p.entities.find(e=>e.kind==='enemy')!.x=340;
    expect(checkReachability(p,{targetTerrainId:'optional-float-ledge'}).status).toBe('unsupported');
    const clear=createStarterProject();clear.terrain.push({id:'spawn-wall',x:90,y:560,width:80,height:60});
    expect(checkReachability(clear,{targetTerrainId:'optional-float-ledge'}).status).toBe('unsupported');
    expect(checkReachability(createStarterProject(),{targetTerrainId:'not-a-surface'}).status).toBe('unsupported');
  });
  it('honors an explicit canonical source and reports finite content budgets', () => {
    const p=createStarterProject();
    const atTarget=checkReachability(p,{sourceTerrainId:'optional-float-ledge',targetTerrainId:'optional-float-ledge'});
    expect(atTarget.status).toBe('route-found');expect(atTarget.witness?.start.y).toBe(264);
    for(let i=0;i<81;i++)p.terrain.push({id:`tiny-${i}`,x:30+i*8,y:100,width:8,height:8});
    const r=checkReachability(p,{targetTerrainId:'optional-float-ledge'});
    expect(r.status).toBe('inconclusive');expect(r.limits.steps).toBe(0);
  });
  it('exercises real jump buffer, coyote time and variable-height behavior in the shared step', () => {
    const ground=[{x:0,y:200,width:960,height:80}],world={gravity:1500,width:960};
    const body=():Body=>({x:30,y:144,width:40,height:56,vx:0,vy:0,grounded:true});
    const held=body(),tap=body(),hs=createMotionState(),ts=createMotionState();let high=144,low=144;
    for(let i=0;i<110;i++){
      stepPlayerMotion(held,hs,{direction:0,jumpHeld:true,jumpPressed:i===0},world,ground,0);
      stepPlayerMotion(tap,ts,{direction:0,jumpHeld:i<5,jumpPressed:i===0},world,ground,0);
      high=Math.min(high,held.y);low=Math.min(low,tap.y);
    }
    expect(high).toBeLessThan(low-40);
    const late=body(),ls=createMotionState();late.grounded=false;ls.coyote=.08;
    expect(stepPlayerMotion(late,ls,{direction:1,jumpHeld:true,jumpPressed:true},world,ground,0).jumped).toBe(true);
    const buffered=body(),bs=createMotionState();buffered.y=140;buffered.vy=100;buffered.grounded=false;
    let jumped=false;
    for(let i=0;i<12;i++)jumped ||= stepPlayerMotion(buffered,bs,{direction:0,jumpHeld:true,jumpPressed:i===0},world,ground,0).jumped;
    expect(jumped).toBe(true);
  });
});
