import test from 'node:test';
import assert from 'node:assert/strict';
import {createLatestMotionSender,createMotionSmoother} from '../src/lib/remoteMotion.js';

function fixture(){
  let time=0,id=0,open=true,buffer=0;
  const pending=new Map(),sent=[];
  const sender=createLatestMotionSender({send:value=>sent.push(value),isOpen:()=>open,bufferedAmount:()=>buffer,now:()=>time,intervalMs:33,schedule:(fn,delay)=>{pending.set(++id,{fn,at:time+delay});return id;},cancel:key=>pending.delete(key)});
  return {sender,sent,pending,setOpen:value=>open=value,setBuffer:value=>buffer=value,advance(target){while(true){const next=[...pending].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>target)break;time=next[1].at;pending.delete(next[0]);next[1].fn();}time=target;}};
}
test('30fps sender coalesces to the newest point instead of dropping the trailing movement',()=>{
  const f=fixture();f.sender.send({action:'pull',x:1});
  f.advance(10);f.sender.send({action:'pull',x:2});
  f.advance(20);f.sender.send({action:'pull',x:3});
  f.advance(33);
  assert.deepEqual(f.sent.map(p=>p.x),[1,3]);
});
test('detach/cancel are immediate and discard obsolete pending pull packets',()=>{
  for(const action of ['detach','cancel']){
    const f=fixture();f.sender.send({action:'pull',x:1});f.advance(10);f.sender.send({action:'pull',x:2});
    f.sender.send({action});f.advance(100);
    assert.deepEqual(f.sent.map(p=>p.action),['pull',action]);assert.equal(f.pending.size,0);
  }
});
test('backpressure retains only the latest point; disconnect never replays old motion',()=>{
  const f=fixture();f.setBuffer(2000);f.sender.send({action:'pull',x:1});f.sender.send({action:'pull',x:2});
  f.advance(33);assert.equal(f.sent.length,0);
  f.setBuffer(0);f.advance(66);assert.equal(f.sent[0].x,2);
  f.advance(70);f.sender.send({action:'pull',x:3});f.setOpen(false);f.advance(200);f.setOpen(true);f.advance(400);
  assert.equal(f.sent.length,1);assert.equal(f.pending.size,0);
});
test('sparse network positions interpolate continuously without overshoot',()=>{
  const smooth=createMotionSmoother();smooth.target({x:1,y:.5,angle:30});
  assert.equal(smooth.sample(0).x,0);
  const first=smooth.sample(16);assert.ok(first.x>0&&first.x<1);assert.ok(first.angle>0&&first.angle<30);
  smooth.target({x:0,y:0,angle:0});const returning=smooth.sample(32);assert.ok(returning.x>0&&returning.x<first.x);
});
test('interpolation speed is independent of 30fps versus 60fps rendering',()=>{
  function at(fps){const smooth=createMotionSmoother();smooth.target({x:1,y:.5,angle:30});smooth.sample(0);let value;for(let i=1;i<=fps;i++)value=smooth.sample(i*1000/fps);return value;}
  assert.ok(Math.abs(at(30).x-at(60).x)<1e-10);
});
