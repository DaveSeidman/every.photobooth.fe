import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoothInactivity } from '../src/lib/boothInactivity.js';
function fixture() {
 let time=0,id=0,resets=0,isPaused=false;const tasks=new Map();
 const idle=createBoothInactivity({onTimeout:()=>resets++,now:()=>time,schedule:(fn,ms)=>{tasks.set(++id,{fn,at:time+ms});return id;},cancel:key=>tasks.delete(key),paused:()=>isPaused});
 const advance=ms=>{const target=time+ms;for(;;){const next=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;tasks.delete(next[0]);time=next[1].at;next[1].fn();}time=target;};
 return {idle,tasks,advance,get resets(){return resets;},pause:value=>isPaused=value};
}
test('framing, review, style selection and errors reset after 30 seconds without input',()=>{
 for(const phase of ['camera','review','styles','error']){const f=fixture();f.idle.setPhase(phase);f.advance(29999);assert.equal(f.resets,0,phase);f.advance(1);assert.equal(f.resets,1,phase);f.advance(60000);assert.equal(f.resets,1,phase);}
});
test('recent activity extends the deadline without scheduling timers on every move',()=>{
 const f=fixture();f.idle.setPhase('review');f.advance(25000);for(let i=0;i<100;i++)f.idle.activity();assert.equal(f.tasks.size,1);
 f.advance(29999);assert.equal(f.resets,0);f.advance(1);assert.equal(f.resets,1);
});
test('countdown, generation, takeaway and reset phases never run the general timer',()=>{
 for(const phase of ['attract','countdown','flash','processing','results','resetting','camera-reveal']){
  const f=fixture();f.idle.setPhase('styles');const stale=[...f.tasks.values()][0].fn;
  f.idle.setPhase(phase);f.idle.activity();assert.equal(f.tasks.size,0,phase);stale();f.advance(120000);assert.equal(f.resets,0,phase);
 }
});
test('moving between waiting screens starts a fresh deadline and leaving cancels stale callbacks',()=>{
 const f=fixture();f.idle.setPhase('camera');f.advance(29000);f.idle.setPhase('review');f.advance(29999);assert.equal(f.resets,0);f.advance(1);assert.equal(f.resets,1);
 const g=fixture();g.idle.setPhase('review');const stale=[...g.tasks.values()][0].fn;g.idle.dispose();stale();g.advance(60000);assert.equal(g.resets,0);
});
test('operator controls can remain open without discarding the current session',()=>{
 const f=fixture();f.idle.setPhase('review');f.pause(true);f.advance(60000);assert.equal(f.resets,0);
 f.pause(false);f.idle.activity();f.advance(29999);assert.equal(f.resets,0);f.advance(1);assert.equal(f.resets,1);
});
