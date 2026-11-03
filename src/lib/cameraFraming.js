export const defaultFraming = { zoom: 1, x: 50, y: 50 };

// Matches the square, object-fit: cover preview at every source aspect ratio.
export function captureRegion(width, height, framing) {
  const size = Math.min(width, height) / framing.zoom;
  return {
    x: (width - size) * framing.x / 100,
    y: (height - size) * framing.y / 100,
    size,
  };
}
