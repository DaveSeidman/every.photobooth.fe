const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function ticketPull({ dx, dy, width, grabX }) {
  const distance = Math.max(0, dy);
  const progress = clamp(distance / 90, 0, 1);
  const origin = grabX >= .5 ? 0 : 100;
  const lever = Math.max(70, width * Math.max(grabX, 1 - grabX));
  const angle = clamp(Math.atan2(distance, lever) * 180 / Math.PI, 0, 32) * (origin === 0 ? 1 : -1);
  return { progress, origin, x: clamp(dx, -100, 100) * progress * .4, y: distance * progress * .55, angle, complete: distance >= 90 };
}

// Invert the ticket's peel transform so the light remains under the finger.
export function ticketLightPoint({ startX, startY, dx, dy, width, pull }) {
  const pivot = width * pull.origin / 100;
  const radians = -pull.angle * Math.PI / 180;
  const x = startX + dx - pull.x - pivot;
  const y = startY + dy - pull.y;
  return { x: pivot + x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) };
}

// Measure tap tolerance in screen pixels, independent of the Polaroid scale.
export function isTicketTap({ moved, maxTravel = 0, startedAt }, now) {
  return !moved || (maxTravel <= 26 && now - startedAt <= 700);
}
