import test from 'node:test';
import assert from 'node:assert/strict';
import { installFirstTapFullscreen } from '../src/lib/firstTapFullscreen.js';

function setup(origin='https://photobooth.lightboxlive.io',request=()=>Promise.resolve()) {
  const listeners=new Map(), logs=[];
  const doc={documentElement:{requestFullscreen:request},addEventListener(type,handler,capture){assert.equal(capture,true);listeners.set(type,handler);},removeEventListener(type,handler,capture){assert.equal(capture,true);if(listeners.get(type)===handler)listeners.delete(type);}};
  const cleanup=installFirstTapFullscreen({doc,pageLocation:{origin},log:(...args)=>logs.push(args)});
  const tap=(trusted=true)=>listeners.get('click')?.({isTrusted:trusted,preventDefault(){assert.fail('Tap must preserve normal control activation');},stopPropagation(){assert.fail('Tap must propagate');}});
  return {doc,listeners,logs,cleanup,tap};
}

test('only the canonical HTTPS production origin installs automatic fullscreen',()=>{
  for(const origin of ['http://localhost:8080','http://192.168.1.2:8080','https://daveseidman.github.io','https://photobooth.lightboxlive.io.example.com']) {
    const fixture=setup(origin);
    assert.equal(fixture.listeners.size,0);
  }
});
test('first genuine tap requests fullscreen synchronously once without consuming the tap',async()=>{
  let calls=0;
  const fixture=setup(undefined,function(options){calls++;assert.equal(this,fixture.doc.documentElement);assert.deepEqual(options,{navigationUI:'hide'});return Promise.resolve();});
  fixture.tap(false);assert.equal(calls,0);
  fixture.tap();assert.equal(calls,1);
  fixture.tap();assert.equal(calls,1);
  assert.equal(fixture.listeners.size,3);
  await Promise.resolve();
});
test('legacy Safari fullscreen method is supported',()=>{
  const fixture=setup();let calls=0;
  delete fixture.doc.documentElement.requestFullscreen;
  fixture.doc.documentElement.webkitRequestFullscreen=()=>{calls++;};
  fixture.tap();assert.equal(calls,1);
});
test('already-fullscreen and unsupported browsers leave controls usable',()=>{
  const already=setup(undefined,()=>assert.fail('Already fullscreen'));
  already.doc.fullscreenElement={};already.tap();
  const unsupported=setup();delete unsupported.doc.documentElement.requestFullscreen;unsupported.tap();
  assert.equal(unsupported.logs[0][0],'fullscreen.unavailable');
});
test('rejected fullscreen requests are logged without an unhandled rejection',async()=>{
  const fixture=setup(undefined,()=>Promise.reject(new Error('Not allowed')));
  fixture.tap();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(fixture.logs.some(([event])=>event==='fullscreen.request-failed'));
});

test('phone takeaway leaves its first tap available for the native share sheet',()=>{
  const listeners=[];
  installFirstTapFullscreen({doc:{addEventListener(...args){listeners.push(args);}},pageLocation:{origin:'https://photobooth.lightboxlive.io',hash:'#/takeaway/portrait-123'}});
  assert.equal(listeners.length,0);
});

const settle = () => new Promise(resolve=>setImmediate(resolve));
test('fullscreen exit re-arms the next trusted tap and never requests from the exit event itself',async()=>{
  let calls=0;
  const fixture=setup(undefined,()=>{calls++;fixture.doc.fullscreenElement={};return Promise.resolve();});
  fixture.tap();await settle();assert.equal(calls,1);
  fixture.listeners.get('fullscreenchange')();fixture.tap();assert.equal(calls,1);
  fixture.doc.fullscreenElement=null;
  fixture.listeners.get('fullscreenchange')();fixture.listeners.get('webkitfullscreenchange')();
  assert.equal(calls,1);assert.equal(fixture.logs.filter(([event])=>event==='fullscreen.exited').length,1);
  fixture.tap(false);assert.equal(calls,1);
  fixture.tap();assert.equal(calls,2);await settle();
  assert.ok(fixture.logs.some(([event,details])=>event==='fullscreen.requested' && details.trigger==='restore-tap'));
  fixture.cleanup();assert.equal(fixture.listeners.size,0);
});
test('legacy Safari exit and denied requests can recover on a later tap',async()=>{
  let calls=0;
  const fixture=setup();delete fixture.doc.documentElement.requestFullscreen;
  fixture.doc.documentElement.webkitRequestFullscreen=()=>{calls++;if(calls===1)return Promise.reject(new Error('Denied'));fixture.doc.webkitFullscreenElement={};};
  fixture.tap();await settle();fixture.tap();await settle();assert.equal(calls,2);
  fixture.listeners.get('webkitfullscreenchange')();fixture.doc.webkitFullscreenElement=null;fixture.listeners.get('webkitfullscreenchange')();fixture.tap();assert.equal(calls,3);
});
test('Home Screen standalone mode needs no fullscreen API and a route change preserves phone sharing',()=>{
  const doc={addEventListener(){assert.fail('Standalone app must not request fullscreen');}};
  installFirstTapFullscreen({doc,pageLocation:{origin:'https://photobooth.lightboxlive.io'},standalone:true});
  const listeners=new Map(),pageLocation={origin:'https://photobooth.lightboxlive.io'};
  installFirstTapFullscreen({doc:{documentElement:{requestFullscreen(){assert.fail('Phone share gesture must remain available');}},addEventListener:(type,handler)=>listeners.set(type,handler)},pageLocation});
  pageLocation.hash='#/takeaway/portrait';listeners.get('click')({isTrusted:true});
});
