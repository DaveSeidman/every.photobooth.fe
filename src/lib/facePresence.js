// A little confirmation on entry and a longer grace period on exit stop jitter.
export function createFacePresence({ enterMs = 200, leaveMs = 1400 } = {}) {
  let present = false;
  let firstSeen = null;
  let lastSeen = -Infinity;
  return (hasFace, now) => {
    if (hasFace) {
      lastSeen = now;
      if (firstSeen === null) firstSeen = now;
      if (!present && now - firstSeen >= enterMs) present = true;
    } else {
      firstSeen = null;
      if (present && now - lastSeen >= leaveMs) present = false;
    }
    return present;
  };
}
