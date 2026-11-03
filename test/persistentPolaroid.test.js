import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

test('each booth phase renders one shared Polaroid and still-image slot', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: {hostname:'localhost',origin:'http://localhost',href:'http://localhost/'}, matchMedia:()=>({matches:false}) };
  // Render JSX without opening a browser or starting a listening HTTP server.
  const vite = await createServer({server:{middlewareMode:true,hmr:false,watch:null,open:false},appType:'custom',logLevel:'silent'});
  try {
    const {default:Preview} = await vite.ssrLoadModule('/src/components/DesignPreview.jsx');
    for (const screen of ['attract','camera','countdown','review','styles','processing','results']) {
      const markup=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[`/preview/${screen}`]},React.createElement(Routes,null,React.createElement(Route,{path:'/preview/:screen',element:React.createElement(Preview)}))));
      assert.equal((markup.match(/class="camera-photo /g)||[]).length,1,`${screen}: shared frame`);
      assert.equal((markup.match(/class="camera__still"/g)||[]).length,1,`${screen}: shared image`);
      assert.ok(!markup.includes('class="result-hero"'),`${screen}: no second results frame`);
      assert.equal((markup.match(/class="thesis-chrome"/g)||[]).length,1,`${screen}: one background layer`);
      if(screen==='results') {
        const resultLayer=markup.slice(markup.indexOf('<section class="results'));
        assert.ok(!resultLayer.includes('class="thesis-chrome"'),'background must not enter the foreground results layer');
        assert.match(markup, /<button[^>]*class="[^"]*results__reset-timer[^"]*ticket-button/, 'reset countdown is a selectable tear-away ticket');
      }
      if(screen==='styles') {
        assert.ok(!markup.includes('Retake'),'style selection has no retake control');
        assert.ok(markup.includes('data-depth="back"'),'original recedes behind the choices');
        assert.equal((markup.match(/class="style-option-layer /g)||[]).length,2,'two independent front layers');
      }
    }
  } finally {
    await vite.close();
    if(previousWindow === undefined) delete globalThis.window; else globalThis.window=previousWindow;
  }
});
