import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperatorGesture, refreshUrl } from '../src/lib/operatorGesture.js';
const finger=(identifier,clientX,clientY=60)=>({identifier,clientX,clientY});
function setup() {
 let triggered=0,id=0;const timers=new Map();
 const gesture=createOperatorGesture({trigger:()=>triggered++,viewport:()=>({width:820}),schedule:(fn,delay)=>{assert.equal(delay,2000);timers.set(++id,fn);return id;},cancel:key=>timers.delete(key)});
 return {gesture,timers,get triggered(){return triggered;},fire(){for(const [key,fn] of [...timers]){timers.delete(key);fn();}}};
}
test('both upper corners held together reveal controls once until all fingers release',()=>{
 const f=setup();assert.equal(f.gesture.update([finger(1,50)]),false);assert.equal(f.timers.size,0);
 assert.equal(f.gesture.update([finger(1,50),finger(2,770)]),true);assert.equal(f.triggered,0);f.fire();assert.equal(f.triggered,1);
 f.gesture.update([finger(1,50),finger(2,770)]);f.fire();assert.equal(f.triggered,1);
 f.gesture.update([]);f.gesture.update([finger(3,50),finger(4,770)]);f.fire();assert.equal(f.triggered,2);
});
test('early release, cancellation, drifting or ordinary touches never trigger a refresh panel',()=>{
 for(const end of [[],[finger(1,50)],[finger(1,200),finger(2,770)],[finger(1,50,300),finger(2,770)],[finger(1,50),finger(2,770),finger(3,400)]]){
  const f=setup();f.gesture.update([finger(1,50),finger(2,770)]);f.gesture.update(end);f.fire();assert.equal(f.triggered,0);
 }
 const f=setup();f.gesture.update([finger(1,50),finger(2,770)]);f.gesture.update([],true);f.fire();assert.equal(f.triggered,0);
 f.gesture.update([finger(1,50),finger(2,770)]);f.gesture.dispose();f.fire();assert.equal(f.triggered,0);
});
test('refresh bypasses a cached document, preserves the hosting path and resets to the booth',()=>{
 const url=new URL(refreshUrl('https://photobooth.lightboxlive.io/every/?_booth_refresh=old#/preview/results',1234));
 assert.equal(url.pathname,'/every/');assert.equal(url.searchParams.get('_booth_refresh'),'1234');assert.equal(url.hash,'#/');
});
