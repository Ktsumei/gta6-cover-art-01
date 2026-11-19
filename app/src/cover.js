// The cover renderer: draws the whole poster on any 2D canvas at any size.
// The same function paints the live preview and the exported PNG, so what the
// editor shows is exactly what the file holds. Nothing here touches the DOM.

import { panelRects, slotCount } from './layouts.js';
import { gradeOverlay, captionScrim } from './grades.js';

// Geometry of one cover: the white poster frame and the framed area the
// panels live in. The editor reuses this to hit-test panels.
export function coverGeometry(width, height, layoutName) {
  const frame = Math.max(10, Math.round(Math.min(width, height) * 0.016));
  const gutter = Math.max(6, Math.round(Math.min(width, height) * 0.009));
  const area = { x: frame, y: frame, w: width - frame * 2, h: height - frame * 2 };
  const rects = panelRects(layoutName, area.x, area.y, area.w, area.h, gutter);
  return { frame, gutter, area, rects };
}

// Where a photo lands inside a panel: cover-fit, scaled by zoom, shifted by
// the panel's pan offsets (fractions of the panel's size, clamped by the
// caller so the photo always covers the panel). Vertically the crop is
// anchored near the top of the photo (30% of the overflow hidden above),
// because a cover's subject — a face — usually sits in the upper half;
// horizontally it stays centred.
export function photoPlacement(panel, image) {
  const base = Math.max(panel.w / image.width, panel.h / image.height);
  const scale = base * panel.zoom;
  const dw = image.width * scale;
  const dh = image.height * scale;
  return {
    x: panel.x + (panel.w - dw) / 2 + panel.ox * panel.w,
    y: panel.y + (panel.h - dh) * 0.3 + panel.oy * panel.h,
    w: dw,
    h: dh,
  };
}

// Clamp a panel's pan offsets so its photo still covers the panel. The
// vertical range is asymmetric around the 30% anchor: the photo can slide
// down until its top edge meets the panel's, and up until its bottom does.
export function clampPan(panel, rect, image) {
  const place = photoPlacement({ ...panel, ...rect }, image);
  const overX = Math.max(0, place.w - rect.w);
  const overY = Math.max(0, place.h - rect.h);
  const maxOx = overX / 2 / rect.w;
  panel.ox = Math.max(-maxOx, Math.min(maxOx, panel.ox));
  const maxDown = (0.3 * overY) / rect.h;
  const maxUp = (0.7 * overY) / rect.h;
  panel.oy = Math.max(-maxUp, Math.min(maxDown, panel.oy));
}

// Split a caption into stacked lines: explicit newlines first, otherwise one
// balanced split for long two-word titles.
export function captionLines(caption) {
  const raw = (caption || '').trim().toUpperCase();
  if (!raw) return ['COVER'];
  const byBreak = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  if (byBreak.length > 1) return byBreak.slice(0, 3);
  const words = byBreak[0].split(/\s+/);
  if (words.length < 2 || byBreak[0].length <= 9) return [byBreak[0]];
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    const gap = Math.abs(a - b);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// A deterministic grain tile, built once and reused as a pattern.
let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(160, 160);
  let seed = 20261119;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

// Draw the lettering: the subtitle in script above the big stacked caption,
// the caption in heavy display type with a thick dark outline, tilted a touch.
function drawLettering(ctx, width, height, state) {
  const lines = captionLines(state.caption);
  const unit = Math.min(width, height);
  const size = unit * 0.115 * (state.captionScale || 1);
  const left = width * 0.045;
  const bottom = height * 0.965;
  const lineHeight = size * 0.94;

  ctx.save();
  ctx.translate(left, bottom - (lines.length - 1) * lineHeight);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(8,4,16,0.92)';
  ctx.lineWidth = size * 0.085;
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => {
    const y = i * lineHeight;
    ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  ctx.restore();

  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = unit * 0.034;
    ctx.save();
    ctx.translate(left + width * 0.01, bottom - lines.length * lineHeight - subSize * 0.5);
    ctx.rotate((-2.2 * Math.PI) / 180);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = subSize * 0.14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,4,16,0.85)';
    ctx.fillStyle = '#ff7eb6';
    ctx.strokeText(subtitle, 0, 0);
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }
}

// Paint the full cover. `state` carries layout, grade, caption and one
// panel entry per slot: { photo, zoom, ox, oy }. `photos` is the loaded
// image list; a slot with no photo yet gets a warm placeholder wash.
export function drawCover(ctx, width, height, state, photos) {
  const layoutName = state.layout || 'hero';
  const { frame, area, rects } = coverGeometry(width, height, layoutName);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const slots = slotCount(layoutName);
  for (let i = 0; i < slots; i++) {
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const rect = rects[i];
    const image = photos[panel.photo];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (image) {
      const place = photoPlacement({ ...panel, ...rect }, image);
      ctx.drawImage(image, place.x, place.y, place.w, place.h);
    } else {
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, '#3b2a5e');
      wash.addColorStop(1, '#12081f');
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradeOverlay(ctx, state.grade, rect, state.gradeStrength ?? 0.7);
    ctx.restore();
  }

  // Thin dark keyline around each panel so the tiles stay crisp.
  ctx.save();
  ctx.strokeStyle = 'rgba(10,6,18,0.55)';
  ctx.lineWidth = Math.max(1, Math.min(width, height) * 0.002);
  for (const rect of rects) {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();

  captionScrim(ctx, area.x, area.y, area.w, area.h);
  drawLettering(ctx, width, height, state);

  // Vignette and grain over the whole poster.
  ctx.save();
  const vig = ctx.createRadialGradient(
    width / 2, height * 0.45, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,4,16,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  const grain = grainPattern(ctx);
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // The frame edge.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, width - frame, height - frame);
  ctx.restore();
}

// Render the cover onto a fresh canvas at exact export size.
export function renderCoverCanvas(width, height, state, photos) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, width, height, state, photos);
  return canvas;
}
