# Thesis photobooth — November 5, 2026, in Brooklyn

This is the running list of unfinished work and event preparation. Update it as tasks are completed or new issues appear.

## Remaining work

- [ ] Practice putting the iPad into the stand and taking it out; aim to avoid removing it during the show.
- [ ] Log into the TeamViewer desktop app on the desktop computer (currently using TeamViewer through the web).
- [ ] Confirm the new print Mac uses the DNP QW410 driver, then get one successful physical print and verify the dashboard reports Printed.
- [ ] Pull the latest print-server changes on the new Mac, set `NGROK_URL=https://genuine-bee-humble.ngrok-free.app` in `.env`, and verify `npm run start:booth` starts the server, fixed tunnel, and keep-awake process.
- [ ] Test Home Screen app fullscreen entry/recovery and Guided Access on the actual iPad.

- [ ] Get the rest of emperor prompt 2 (currently supplied only through “deep shadows…”).
- [x] Generate both emperor thumbnails from the original couple photo and replace the temporary thumbnails.
- [ ] Review the emperor thumbnails and new capture/development animation on the iPad.
- [ ] On the iPad, test taps, corner pulls, incomplete pulls, and touch cancellation for attached ticket buttons.
- [ ] Check every screen in portrait at 820 × 1180, then on the actual iPad 11-inch A16 in Safari.
- [ ] Verify camera permission, framing, brightness, charging, and screen lock settings in the iPad Home Screen app.
- [ ] Demo the complete capture → parallel generations → photo strip → print → QR download flow.
- [ ] Exercise F1 simulations for no internet, AI error, and the 2× timeout; switch back to Normal operation afterward.
- [ ] Verify local operation with WAN disconnected while the iPad and Mac remain connected on the same LAN.
- [ ] Confirm offline loading/caching and backend requirements: the hosted booth still needs internet to reach Render; local image filters alone do not provide fully offline operation.
- [ ] Test paper-out, printer disconnect, and recovery without duplicate prints.
- [ ] Confirm Mac/backend/print-server startup and recovery after restart.
- [ ] Review fallback prints and the ticket layout on actual stock.

## Important links

- [ ] Keep this link list bookmarked or open on the operator's computer for the event.

- Frontend / iPad booth: https://photobooth.lightboxlive.io/every/
- Backend: https://every-photobooth-backend.onrender.com/
- Admin / print queue / analytics: https://every-photobooth-backend.onrender.com/status
- Backend health: https://every-photobooth-backend.onrender.com/health
- Backend configuration: https://every-photobooth-backend.onrender.com/config
- Fixed print tunnel health: https://genuine-bee-humble.ngrok-free.app/health
- Local print-server health (on the print Mac): http://localhost:9000/health
- Local print-server status (requires the print-server bearer token): http://localhost:9000/status
- Render backend management: https://dashboard.render.com/web/srv-dac4ndon74is7394o73g
- ngrok endpoints: https://dashboard.ngrok.com/endpoints
- ngrok domains: https://dashboard.ngrok.com/domains
- ngrok usage: https://dashboard.ngrok.com/usage
- Fal.ai account / credits: https://fal.ai/dashboard
- Frontend repository: https://github.com/DaveSeidman/every.photobooth.fe
- Backend repository: https://github.com/DaveSeidman/every.photobooth.be
- Print-server repository: https://github.com/DaveSeidman/every.photobooth.print-server

Guest takeaway links are unique to each photo; use the QR code shown on the booth. Credentials belong in the password manager or local configuration, not in this document.

## Day of

- [ ] **Top up Fal.ai credits** and check the balance before opening.
- [ ] Connect the Mac, iPad, and printer; confirm the local network and camera permissions.
- [ ] Load fresh DNP QW410 center-perforated 4 × 6 media and the matching ribbon; keep spare sets nearby.
- [ ] Run one full-flow test and inspect the print, center split, QR download, and Printed status.
- [ ] Set F1 fallback simulation to Normal operation and confirm automatic printing is enabled.
- [ ] Reset the all-time completed counter to zero immediately before guests arrive.
- [ ] Keep the status dashboard open and confirm it updates automatically.

## Packing list

- [ ] iPad 11-inch A16, stand/mount, and charging adapter.
- [ ] Booth Mac, charger, and any necessary display/input accessories.
- [ ] DNP QW410 printer and its correct power supply.
- [ ] Loaded center-perforated 4 × 6 media/ribbon plus spare matched sets.
- [ ] **2 × iPad charging cables** (correct connectors for the iPad and charger).
- [ ] **2 × Mac charging cables** (correct connector for this Mac).
- [ ] **2 × printer USB data cables** (correct printer and Mac/hub connectors; data-capable).
- [ ] **2 × printer power cords** (correct type; bring a spare compatible power supply if available).
- [ ] **2 × Ethernet cables**, if using wired networking.
- [ ] **2 × each additional cable used in the setup**, including any display or network equipment power leads.
- [ ] **2 × each required USB adapter/hub**, plus the correct charging adapters.
- [ ] Local router/access point and its power supply, if using a dedicated booth LAN.
- [ ] Power strip/surge protector and **2 × extension cords**.
- [ ] Backup internet/hotspot, with its charger and **2 × charging cables** if separate.
- [ ] Gaffer tape, cable ties, labels, and a small cleaning cloth.
- [ ] Printed startup/recovery notes and local service addresses.
