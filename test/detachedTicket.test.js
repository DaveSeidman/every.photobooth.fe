import test from 'node:test';
import assert from 'node:assert/strict';
import { animateDetachedTicket } from '../src/lib/detachedTicket.js';
function setup() {
 let finish;const finished=new Promise(resolve=>finish=resolve);
 const node=()=>({style:{setProperty(){}},removeAttribute(){},setAttribute(){},querySelectorAll:()=>[],append(child){this.child=child;},remove(){this.removed=true;}});
 const copy=node();copy.animate=()=>({finished});
 const layers=[];const doc={body:{append:layer=>layers.push(layer)},createElement:node};
 const button={...node(),offsetWidth:600,offsetHeight:88,getBoundingClientRect:()=>({left:100,top:400,width:300,height:44}),cloneNode:()=>copy};
 const computed=()=>Object.assign(['color'],{getPropertyValue:()=> 'rgb(255,255,255)'});
 return {button,copy,doc,layers,finish,computed};
}
test('visual tear is detached from the real button and never waits before returning control',async()=>{
 const f=setup();const result=animateDetachedTicket(f.button,{doc:f.doc,computed:f.computed});
 assert.equal(result,undefined);assert.equal(f.layers.length,1);
 const layer=f.layers[0];assert.equal(layer.inert,true);assert.equal(layer.style.pointerEvents,'none');assert.equal(layer.style.transform,'scale(0.5,0.5)');
 assert.equal(layer.removed,undefined); // App can change screens while the tear is still falling.
 f.finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(layer.removed,true);
});
test('reduced motion skips the copy and failed animations clean up immediately',()=>{
 const reduced=setup();animateDetachedTicket(reduced.button,{doc:reduced.doc,reduced:true});assert.equal(reduced.layers.length,0);
 const failed=setup();failed.copy.animate=()=>{throw new Error('Animation unavailable');};
 animateDetachedTicket(failed.button,{doc:failed.doc,computed:failed.computed});assert.equal(failed.layers[0].removed,true);
});
