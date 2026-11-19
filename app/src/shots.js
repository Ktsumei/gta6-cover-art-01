// Reproducible scenes for screenshots, driven by the page's query string:
//   ?shot=cover&photo=pier&caption=Sunset%20Heist&size=1920x1080
//     shows one exported cover alone, edge to edge, no editor chrome.
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen
//     shows the editor with that photo loaded and the caption set.
// Every other parameter is optional: layout, grade, gradeStrength (0-100),
// subtitle, size. When a scene has painted, window.__shotReady is set so a
// screenshot tool knows the frame is final.

import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';
import { EXPORT_SIZES } from './editor.js';

const PHOTO_BY_NAME = { boulevard: 0, pier: 1 };

function param(query, name) {
  const value = query.get(name);
  return value === null ? null : value;
}

// Spread the named sample photo across the panels: the hero takes it, the
// rest alternate through the loaded samples so the cover shows variety.
function spreadPhoto(editor, photoIndex) {
  const count = editor.tray.photos.length;
  if (count === 0) return;
  editor.state.panels.forEach((panel, i) => {
    panel.photo = (photoIndex + i) % count;
    panel.ox = 0;
    panel.oy = 0;
  });
}

export function applyShotParams(editor) {
  const query = new URLSearchParams(window.location.search);
  const shot = param(query, 'shot');
  if (!shot) return false;

  const photoName = param(query, 'photo');
  if (photoName && photoName in PHOTO_BY_NAME) {
    spreadPhoto(editor, PHOTO_BY_NAME[photoName]);
  }

  const layout = param(query, 'layout');
  if (layout && LAYOUTS[layout]) editor.setLayout(layout);

  const grade = param(query, 'grade');
  if (grade && GRADES[grade]) editor.setGrade(grade);

  const strength = param(query, 'gradeStrength');
  if (strength !== null) {
    editor.state.gradeStrength = Math.max(0, Math.min(100, Number(strength))) / 100;
  }

  const size = param(query, 'size');
  if (size && EXPORT_SIZES.some((s) => s.id === size)) editor.setSize(size);

  const caption = param(query, 'caption');
  if (caption !== null) {
    editor.state.caption = caption;
    const input = document.querySelector('#captionInput');
    if (input) input.value = caption;
  }
  const subtitle = param(query, 'subtitle');
  if (subtitle !== null) {
    editor.state.subtitle = subtitle;
    const input = document.querySelector('#subtitleInput');
    if (input) input.value = subtitle;
  }

  if (shot === 'cover') {
    document.body.classList.add('cover-shot');
    editor.showSelection = false;
  }

  editor.render();
  return true;
}

// Paint once more after fonts settle, then tell the screenshot tool the
// frame is ready.
export async function markShotReady(editor) {
  try {
    await document.fonts.ready;
  } catch {
    // Fonts are local; a failure still leaves the fallback typefaces.
  }
  editor.render();
  window.__shotReady = true;
}
