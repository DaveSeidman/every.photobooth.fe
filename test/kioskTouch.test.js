import test from 'node:test';
import assert from 'node:assert/strict';
import { installKioskTouchGuard } from '../src/lib/kioskTouch.js';
function setup() {
  const handlers=new Map();
  const doc={addEventListener(type,listener,options){assert.deepEqual(options,{capture:true,passive:false});handlers.set(type,listener);},removeEventListener(type,listener,capture){assert.equal(listener,handlers.get(type));assert.equal(capture,true);handlers.delete(type);}};
  const cleanup=installKioskTouchGuard({doc,viewportWidth:()=>820});
  return {cleanup,handlers,send(type,{booth=true,developer=false,cancelable=true,x=400,touches=1}={}) {let prevented=false;handlers.get(type)({cancelable,touches:Array.from({length:touches},()=>({clientX:x})),target:{closest:selector=>selector==='.booth'?booth:developer},preventDefault(){prevented=true;}});return prevented;}};
}
test('booth movement is cancelled from the first move without consuming ordinary taps or touchend',()=>{
  const fixture=setup();assert.equal(fixture.send('touchmove'),true);assert.equal(fixture.send('touchstart'),false);assert.equal(fixture.handlers.has('touchend'),true);fixture.cleanup();assert.equal(fixture.handlers.size,0);
});
test('edge gestures are claimed at touchstart on either side of the booth',()=>{
  const fixture=setup();for(const x of [0,15,24,800,820])assert.equal(fixture.send('touchstart',{x}),true);
  assert.equal(fixture.send('touchstart',{x:15,booth:false}),false);
  assert.equal(fixture.send('touchstart',{x:15,developer:true}),false);
  assert.equal(fixture.send('touchstart',{x:15,touches:2}),false);
});
test('developer scrolling and phone page gestures stay available',()=>{
  const fixture=setup();assert.equal(fixture.send('touchmove',{developer:true}),false);assert.equal(fixture.send('touchmove',{booth:false}),false);assert.equal(fixture.send('touchmove',{cancelable:false}),false);
});

test('ordinary booth buttons activate on quick release even when a small movement cancels native clicks',()=>{
  const handlers=new Map();let clicks=0,prevented=0;
  const button={disabled:false,isConnected:true,matches:()=>false,click:()=>clicks++};
  const target={closest:selector=>selector==='.booth'?{}:selector==='button'?button:null};
  installKioskTouchGuard({doc:{addEventListener:(type,handler)=>handlers.set(type,handler)},viewportWidth:()=>820});
  const t=(x,y)=>({identifier:1,clientX:x,clientY:y});
  const start=()=>handlers.get('touchstart')({target,cancelable:true,touches:[t(300,400)],preventDefault(){}});
  const end=(x,y,type='touchend')=>handlers.get(type)({type,target,cancelable:true,touches:[],changedTouches:[t(x,y)],preventDefault(){prevented++;}});
  start();handlers.get('touchmove')({target,cancelable:true,touches:[t(308,405)],preventDefault(){}});end(310,405);
  assert.equal(clicks,1);assert.equal(prevented,1);
  start();end(360,500);assert.equal(clicks,1);
  start();end(300,400,'touchcancel');assert.equal(clicks,1);
  start();button.disabled=true;end(300,400);assert.equal(clicks,1);
});
