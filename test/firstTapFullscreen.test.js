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
  assert.equal(fixture.listeners.size,0);
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
