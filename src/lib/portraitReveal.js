// Decode the actual persistent photo slot, not just a separate preload image.
// It stays hidden under the storm until this resolves and the reveal begins.
export async function preparePortraitReveal(image, src) {
  if (!image || !src) throw new Error('The portrait image is unavailable.');
  image.style.setProperty('--image-opacity', '0');
  if (image.src !== new URL(src, image.ownerDocument?.baseURI || globalThis.location?.href).href || (image.complete && !image.naturalWidth)) image.src = src;
  if (typeof image.decode === 'function') {
    try { await image.decode(); }
    catch (error) { if (!image.complete || !image.naturalWidth) throw error; }
  } else if (!image.complete) {
    await new Promise((resolve, reject) => {
      const cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
      const loaded=()=>{cleanup();resolve();};
      const failed=()=>{cleanup();reject(new Error('The finished portrait could not be loaded.'));};
      image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
    });
  }
  if (!image.naturalWidth) throw new Error('The finished portrait could not be decoded.');
}
