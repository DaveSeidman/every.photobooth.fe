import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePortraitReveal } from '../src/lib/portraitReveal.js';

function image(decode) {
  const styles=new Map();
  return {src:'https://booth.example/original.jpg',ownerDocument:{baseURI:'https://booth.example/'},naturalWidth:1200,complete:true,style:{setProperty:(key,value)=>styles.set(key,value)},styles,decode};
}
test('persistent photo is swapped while hidden and reveal waits for its actual decode',async()=>{
  let finish;const decoded=new Promise(resolve=>finish=resolve);const img=image(()=>decoded);let ready=false;
  const pending=preparePortraitReveal(img,'/finished.jpg').then(()=>ready=true);
  assert.equal(img.styles.get('--image-opacity'),'0');assert.equal(img.src,'/finished.jpg');
  await Promise.resolve();assert.equal(ready,false);
  finish();await pending;assert.equal(ready,true);
});
test('failed full-size decode cannot release the storm onto the old photo',async()=>{
  const img=image(()=>Promise.reject(new Error('Decode failed')));img.complete=false;img.naturalWidth=0;
  await assert.rejects(preparePortraitReveal(img,'/finished.jpg'),/Decode failed/);
  assert.equal(img.styles.get('--image-opacity'),'0');
});
test('already decoded cached images and browsers without decode are supported',async()=>{
  await preparePortraitReveal(image(()=>Promise.resolve()),'/finished.jpg');
  await preparePortraitReveal(image(),'/finished.jpg');
  // Some Safari versions reject decode even though the loaded image is usable.
  await preparePortraitReveal(image(()=>Promise.reject(new Error('Already decoded'))),'/finished.jpg');
});
