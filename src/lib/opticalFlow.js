// Sparse, two-level Lucas–Kanade optical flow. Coordinates are in analysis pixels.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function grayscale(rgba) {
  const gray = new Float32Array(rgba.length / 4);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = rgba[j] * .299 + rgba[j + 1] * .587 + rgba[j + 2] * .114;
  return gray;
}

export function downsample(frame, width, height) {
  const w = Math.floor(width / 2), h = Math.floor(height / 2);
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * 2 * width + x * 2;
    data[y * w + x] = (frame[i] + frame[i + 1] + frame[i + width] + frame[i + width + 1]) * .25;
  }
  return { data, width: w, height: h };
}

function sample(frame, width, height, x, y) {
  x = clamp(x, 0, width - 1.001); y = clamp(y, 0, height - 1.001);
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const i = iy * width + ix;
  return frame[i] * (1 - fx) * (1 - fy) + frame[i + 1] * fx * (1 - fy)
    + frame[i + width] * (1 - fx) * fy + frame[i + width + 1] * fx * fy;
}

function solve(previous, current, width, height, x, y, vx = 0, vy = 0) {
  if (x < 5 || y < 5 || x > width - 6 || y > height - 6) return { x: 0, y: 0, confidence: 0 };
  let confidence = 0;
  for (let iteration = 0; iteration < 6; iteration++) {
    let xx = 0, xy = 0, yy = 0, xt = 0, yt = 0;
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      const px = x + ox, py = y + oy;
      const gx = (sample(previous, width, height, px + 1, py) - sample(previous, width, height, px - 1, py)) * .5;
      const gy = (sample(previous, width, height, px, py + 1) - sample(previous, width, height, px, py - 1)) * .5;
      const difference = sample(current, width, height, px + vx, py + vy) - sample(previous, width, height, px, py);
      xx += gx * gx; xy += gx * gy; yy += gy * gy; xt += gx * difference; yt += gy * difference;
    }
    const determinant = xx * yy - xy * xy;
    const texture = determinant / (xx + yy + 1);
    if (texture < 30) return { x: 0, y: 0, confidence: 0 };
    confidence = Math.min(1, texture / 500);
    const dx = clamp((xy * yt - yy * xt) / determinant, -1.5, 1.5);
    const dy = clamp((xy * xt - xx * yt) / determinant, -1.5, 1.5);
    vx += dx; vy += dy;
    if (dx * dx + dy * dy < .001) break;
  }
  if (Math.hypot(vx, vy) > 12) return { x: 0, y: 0, confidence: 0 };
  return { x: vx, y: vy, confidence };
}

export function trackPoint(previous, current, width, height, x, y, pyramid) {
  const coarsePrevious = pyramid?.previous || downsample(previous, width, height);
  const coarseCurrent = pyramid?.current || downsample(current, width, height);
  const coarse = solve(coarsePrevious.data, coarseCurrent.data, coarsePrevious.width, coarsePrevious.height, x / 2, y / 2);
  return solve(previous, current, width, height, x, y, coarse.x * 2, coarse.y * 2);
}

export function faceMotion(previous, current, width, height, face, pyramid) {
  const vectors = [];
  for (let row = -2; row <= 2; row++) for (let column = -2; column <= 2; column++) {
    if (row * row + column * column > 5) continue;
    const x = (face.x + face.width * (.5 + column * .15)) * width;
    const y = (face.y + face.height * (.5 + row * .15)) * height;
    const flow = trackPoint(previous, current, width, height, x, y, pyramid);
    if (flow.confidence > .1) vectors.push(flow);
  }
  if (!vectors.length) return { x: 0, y: 0 };
  const median = (key) => vectors.map((v) => v[key]).sort((a, b) => a - b)[Math.floor(vectors.length / 2)];
  return { x: median("x"), y: median("y") };
}
