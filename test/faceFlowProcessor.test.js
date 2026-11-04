import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaceFlowProcessor } from '../src/lib/faceFlowProcessor.js';

test('shared face processor normalizes boxes, throttles inference, releases bitmaps and clears departed faces',()=>{
  let calls=0,closed=0;let detections=[{boundingBox:{originX:40,originY:20,width:80,height:100}}];
  const detector={detectForVideo(){calls++;return {detections};}};
  const canvas={width:160,height:160,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(160*160*4)})})};
  const process=createFaceFlowProcessor(detector,canvas);
  const bitmap=()=>({close(){closed++;}});
  const first=process(bitmap(),1000);assert.equal(first.length,1);assert.equal(first[0].x,.25);assert.equal(first[0].height,.625);
  process(bitmap(),1100);assert.equal(calls,1);
  detections=[];assert.deepEqual(process(bitmap(),1400),[]);assert.equal(calls,2);assert.equal(closed,3);
});
test('main-thread compatibility path accepts a regular canvas without bitmap APIs',()=>{
  const canvas={width:2,height:2,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(16)})})};
  const process=createFaceFlowProcessor({detectForVideo:()=>({detections:[]})},canvas);
  assert.deepEqual(process({},1000),[]);
});
