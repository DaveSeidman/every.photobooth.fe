import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/lib/analytics.js',import.meta.url),'utf8').replace("import { appConfig } from '../config.js';",'const appConfig={apiUrl:"https://api.example"};').replaceAll('import.meta.env','buildEnv').replaceAll('export function','function');
function setup({fail=false,hash='',origin='https://photobooth.lightboxlive.io'}={}) {
  const requests=[],intervals=[],saved=new Map();let sequence=0;
  const context={buildEnv:{BASE_URL:'/every/'},location:{origin,hash},crypto:{randomUUID:()=>`event-test-${++sequence}`},localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},AbortSignal:{timeout:()=>undefined},document:{visibilityState:'visible',addEventListener(){}},window:{setInterval:callback=>intervals.push(callback),addEventListener(){}},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));if(fail)throw new Error('offline');return {ok:true};}};
  const client=vm.runInNewContext(source+';({track,installAnalytics})',context);
  return {client,requests,intervals,saved,setOnline(){fail=false;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('analytics retries the same event ID after offline failures and excludes photo metadata',async()=>{
  const fixture=setup({fail:true,hash:'#/takeaway/private-photo-id'});
  fixture.client.installAnalytics();fixture.client.track('share_complete',{photo:'secret',url:'private-photo-id'});await settle();
  assert.equal(fixture.requests.length,1);const event=fixture.requests[0].events[0];
  assert.equal(event.site,'takeaway');assert.equal(event.environment,'live');assert.equal(event.photo,undefined);assert.equal(event.url,undefined);
  fixture.setOnline();fixture.intervals[0]();await settle();
  assert.equal(fixture.requests[1].events[0].id,event.id);
  assert.equal(JSON.parse(fixture.saved.get('booth-analytics-pending')).length,0);
});
test('installation runs once and local page opens are marked as test traffic',async()=>{
  const fixture=setup({origin:'http://172.20.10.2:8080'});fixture.client.installAnalytics();fixture.client.installAnalytics();await settle();
  assert.equal(fixture.requests.length,1);assert.equal(fixture.requests[0].events[0].name,'booth_view');assert.equal(fixture.requests[0].events[0].environment,'test');assert.equal(fixture.intervals.length,1);
});
