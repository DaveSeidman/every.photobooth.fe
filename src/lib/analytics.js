import { appConfig } from '../config.js';

const live = location.origin === 'https://photobooth.lightboxlive.io';
const storageKey = 'booth-analytics-pending';
let queue = [];
try { queue = JSON.parse(localStorage.getItem(storageKey) || '[]').slice(-100); } catch { /* Storage is optional. */ }
let sending = false;
let installed = false;
const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(queue)); } catch { /* Private browsing. */ } };
const site = () => location.hash.startsWith('#/takeaway/') ? 'takeaway' : 'booth';
const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
const gaEnabled = live && /^G-[A-Z0-9]+$/.test(gaId || '');
const publicLocation = () => `${location.origin}${import.meta.env.BASE_URL}${site() === 'takeaway' ? '#/takeaway' : ''}`;

async function flush() {
  if (sending || !queue.length) return;
  sending = true;
  const batch = queue.slice(0, 30);
  try {
    const response = await fetch(`${appConfig.apiUrl}/api/analytics`, { method: 'POST', headers: {'Content-Type':'text/plain'}, body: JSON.stringify({events:batch}), keepalive:true, signal:AbortSignal.timeout(5000) });
    if (response.ok) { const sent = new Set(batch.map(event=>event.id)); queue = queue.filter(event=>!sent.has(event.id)); persist(); }
  } catch { /* Retain events for the next connection; never block the booth. */ }
  finally { sending = false; }
}

export function track(name, details = {}) {
  try {
    const event = {id:crypto.randomUUID?.() || `event-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, site:site(), environment:live?'live':'test'};
    if (['emperor-cyan','emperor-ink','custom'].includes(details.style)) event.style=details.style;
    if (['ai','local'].includes(details.mode)) event.mode=details.mode;
    if (Number.isFinite(details.durationMs)) event.durationMs=Math.round(details.durationMs);
    queue.push(event); queue=queue.slice(-100); persist();
    if (gaEnabled && window.gtag) {
      const page = {page_location:publicLocation(), page_referrer:location.origin, page_title:event.site==='takeaway'?'Every portrait takeaway':'Every photobooth'};
      if (name==='booth_view' || name==='takeaway_view') window.gtag('event','page_view',page);
      window.gtag('event', name, {...page, site:event.site, style:event.style, generation_mode:event.mode, duration_ms:event.durationMs});
    }
    void flush();
  } catch { /* Analytics must never interrupt an interaction. */ }
}

export function installAnalytics() {
  if (installed) return;
  installed=true;
  if (gaEnabled) {
    window.dataLayer=window.dataLayer || [];
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',gaId,{send_page_view:false, page_location:publicLocation(), page_referrer:location.origin, allow_google_signals:false});
    const script=document.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${gaId}`;document.head.append(script);
  }
  if (site()==='booth') track('booth_view');
  window.setInterval(()=>void flush(),5000);
  window.addEventListener('online',()=>void flush());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flush();});
}
