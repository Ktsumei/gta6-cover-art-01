// Boot the app: build the editor, load the samples, apply any ?shot=
// scene, then paint. A failure to load the display fonts never blocks the
// boot — the editor falls back to system typefaces and still works.

import { CoverEditor } from './editor.js';
import { applyShotParams, markShotReady } from './shots.js';

const editor = new CoverEditor(document.body);
window.coverEditor = editor;

editor.boot().then(() => {
  applyShotParams(editor);
  return markShotReady(editor);
}).catch((error) => {
  console.error('Cover Coast failed to start:', error);
  const stage = document.querySelector('#stageWrap');
  if (stage) {
    stage.insertAdjacentHTML('beforeend', '<p class="boot-error">The cover maker could not start. Reload the page to try again.</p>');
  }
  window.__shotReady = true;
});
