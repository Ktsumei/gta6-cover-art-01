// Colour grades for the cover: each grade is a set of translucent washes
// drawn over the photos. The washes are gradients in the grade's palette,
// blended with 'soft-light' so the photos keep their detail, plus one
// stronger 'overlay' pass for the sunset glow. Strength 0..1 scales every
// wash, so the slider fades the whole grade in and out.

export const GRADES = {
  sunset: {
    label: 'Vice sunset',
    stops: [
      { at: 0.0, color: [255, 176, 66] }, // low amber sun
      { at: 0.45, color: [255, 94, 98] }, // hot pink band
      { at: 1.0, color: [124, 58, 237] }, // violet dusk
    ],
    glow: [255, 190, 90],
    glowAt: { x: 0.5, y: 0.32 },
  },
  neon: {
    label: 'Neon night',
    stops: [
      { at: 0.0, color: [34, 211, 238] }, // cyan
      { at: 0.5, color: [168, 85, 247] }, // violet
      { at: 1.0, color: [236, 72, 153] }, // magenta
    ],
    glow: [45, 212, 191],
    glowAt: { x: 0.5, y: 0.5 },
  },
  clean: {
    label: 'Clean',
    stops: [],
    glow: null,
    glowAt: null,
  },
};

export const GRADE_ORDER = ['sunset', 'neon', 'clean'];

// Paint one grade's washes over a rectangle. `strength` 0..1 scales the
// washes; at 0 the grade is invisible. The caller clips to the panel first.
export function gradeOverlay(ctx, gradeName, rect, strength) {
  const grade = GRADES[gradeName] ?? GRADES.sunset;
  if (strength <= 0.01 || grade.stops.length === 0) return;
  const { x, y, w, h } = rect;

  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  for (const stop of grade.stops) {
    const [r, g, b] = stop.color;
    wash.addColorStop(stop.at, `rgba(${r},${g},${b},${(0.85 * strength).toFixed(3)})`);
  }
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  if (grade.glow) {
    const [r, g, b] = grade.glow;
    const cx = x + grade.glowAt.x * w;
    const cy = y + grade.glowAt.y * h;
    const radius = Math.max(w, h) * 0.62;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, `rgba(${r},${g},${b},${(0.5 * strength).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

// A dark scrim at the foot of the cover so the caption lettering reads over
// any photo, strongest at the very bottom and gone by the upper third.
export function captionScrim(ctx, x, y, w, h) {
  const scrim = ctx.createLinearGradient(x, y + h * 0.55, x, y + h);
  scrim.addColorStop(0, 'rgba(10,6,18,0)');
  scrim.addColorStop(0.55, 'rgba(10,6,18,0.45)');
  scrim.addColorStop(1, 'rgba(10,6,18,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
}
