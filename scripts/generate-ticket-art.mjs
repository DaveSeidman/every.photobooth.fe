import fs from 'node:fs/promises';

// All artwork is drawn at its actual shared design size before group scaling.
function stamp(width, height, fill, edges) {
  const holes = [];
  for (let x = 7.5; x < width; x += 15) for (const y of [edges.includes("top") ? 0 : null, edges.includes("bottom") ? height : null].filter(y => y !== null)) holes.push(`<circle cx="${x}" cy="${y}" r="4.5"/>`);
  for (let y = 7.5; y < height; y += 15) for (const x of [edges.includes("left") ? 0 : null, edges.includes("right") ? width : null].filter(x => x !== null)) holes.push(`<circle cx="${x}" cy="${y}" r="4.5"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="paper"><rect width="${width}" height="${height}" fill="white"/><g fill="black">${holes.join('')}</g></mask></defs><rect width="${width}" height="${height}" fill="${fill}" mask="url(#paper)"/></svg>\n`;
}
for (const [name, width, height, fill, edges] of [
  ['qr-600',600,200,'#fdfaf7',['top','right','bottom','left']],
  ['photo-600',600,648,'#fdfaf7',['top','right','bottom','left']],
  ['ticket-600-ink',600,88,'#121212',['top']],
  ['ticket-300-ink',300,88,'#121212',['top','left']],
  ['ticket-300-cream',300,88,'#fdfaf7',['top','right']],
  ['style-600',600,300,'#fdfaf7',['top','right','bottom','left']],
  ['style-300-left',300,168,'#fdfaf7',['top','right']],
  ['style-300-right',300,168,'#fdfaf7',['top','left']],
]) await fs.writeFile(new URL(`../public/thesis/shapes/${name}.svg`,import.meta.url),stamp(width,height,fill,edges));
