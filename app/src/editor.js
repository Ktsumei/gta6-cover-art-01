// The editor: owns the cover state, paints the live preview, and wires every
// control — layouts, grades, caption, photo tray, pan and zoom, export.
// It renders through drawCover, the same function the export uses.

import { LAYOUTS, LAYOUT_ORDER, slotCount } from './layouts.js';
import { GRADES, GRADE_ORDER } from './grades.js';
import { drawCover, coverGeometry, clampPan, renderCoverCanvas } from './cover.js';
import { PhotoTray } from './photos.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

const DEFAULT_STATE = () => ({
  layout: 'hero',
  grade: 'sunset',
  gradeStrength: 0.7,
  size: '1080x1080',
  caption: 'Sunset Heist',
  subtitle: 'a palm city story',
  captionScale: 1,
  panels: [
    { photo: 0, zoom: 1.1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1.1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.25, ox: 0, oy: 0 },
  ],
});

export class CoverEditor {
  constructor(root) {
    this.root = root;
    this.state = DEFAULT_STATE();
    this.tray = new PhotoTray();
    this.selected = 0;
    this.drag = null;
    this.canvas = root.querySelector('#stage');
    this.ctx = this.canvas.getContext('2d');
    this.toastTimer = 0;
  }

  // Current export size as {w, h}.
  exportSize() {
    return EXPORT_SIZES.find((s) => s.id === this.state.size) ?? EXPORT_SIZES[0];
  }

  // Repaint the preview at the chosen export size.
  render() {
    const { w, h } = this.exportSize();
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    drawCover(this.ctx, w, h, this.state, this.tray.images());
    if (this.showSelection !== false) this.markSelectedPanel();
  }

  // Outline the selected panel on the preview so the user sees which photo
  // the zoom slider and the tray act on.
  markSelectedPanel() {
    const { w, h } = this.exportSize();
    const { rects } = coverGeometry(w, h, this.state.layout);
    const rect = rects[this.selected];
    if (!rect) return;
    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.004);
    this.ctx.setLineDash([Math.max(10, w * 0.012), Math.max(8, w * 0.008)]);
    this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    this.ctx.restore();
  }

  // Which panel, if any, sits under a point in canvas pixels.
  panelAt(px, py) {
    const { w, h } = this.exportSize();
    const { rects } = coverGeometry(w, h, this.state.layout);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  // Convert a pointer event to canvas pixels.
  toCanvasPixels(event) {
    const box = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * this.canvas.width,
      y: ((event.clientY - box.top) / box.height) * this.canvas.height,
    };
  }

  selectPanel(index) {
    const slots = slotCount(this.state.layout);
    this.selected = Math.max(0, Math.min(slots - 1, index));
    this.syncPanelControls();
    this.render();
  }

  // Switch layout, carrying each slot's photo over by index.
  setLayout(name) {
    if (!LAYOUTS[name]) return;
    const old = this.state.panels;
    const slots = slotCount(name);
    this.state.layout = name;
    this.state.panels = Array.from({ length: slots }, (_, i) => {
      const prev = old[i] ?? old[0] ?? { photo: 0, zoom: 1.1, ox: 0, oy: 0 };
      return { photo: prev.photo, zoom: prev.zoom, ox: 0, oy: 0 };
    });
    this.selected = 0;
    this.syncLayoutButtons();
    this.syncPanelControls();
    this.render();
  }

  setGrade(name) {
    if (!GRADES[name]) return;
    this.state.grade = name;
    this.syncGradeButtons();
    this.render();
  }

  setSize(id) {
    if (!EXPORT_SIZES.some((s) => s.id === id)) return;
    this.state.size = id;
    this.syncSizeButtons();
    this.render();
  }

  // Give the selected panel a photo, then repaint.
  assignPhoto(photoIndex) {
    const panel = this.state.panels[this.selected];
    if (!panel) return;
    panel.photo = photoIndex;
    panel.ox = 0;
    panel.oy = 0;
    this.render();
  }

  // Fill every panel with the selected panel's photo.
  fillAllWithSelected() {
    const panel = this.state.panels[this.selected];
    if (!panel || panel.photo < 0) return;
    for (const p of this.state.panels) {
      p.photo = panel.photo;
      p.ox = 0;
      p.oy = 0;
    }
    this.render();
    this.showToast('One photo across every panel');
  }

  // Export the cover at the chosen size as a real PNG download.
  exportPNG() {
    const { w, h, id } = this.exportSize();
    const canvas = renderCoverCanvas(w, h, this.state, this.tray.images());
    canvas.toBlob((blob) => {
      if (!blob) {
        this.showToast('Export failed — try again');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cover-coast-${id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.showToast(`Exported ${w} × ${h} PNG`);
    }, 'image/png');
  }

  showToast(message) {
    const toast = this.root.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ---- control syncing ----

  syncLayoutButtons() {
    for (const btn of this.root.querySelectorAll('.layout-btn')) {
      btn.classList.toggle('active', btn.dataset.layout === this.state.layout);
    }
  }

  syncGradeButtons() {
    for (const btn of this.root.querySelectorAll('.grade-btn')) {
      btn.classList.toggle('active', btn.dataset.grade === this.state.grade);
    }
    const slider = this.root.querySelector('#gradeStrength');
    if (slider) slider.value = String(Math.round(this.state.gradeStrength * 100));
  }

  syncSizeButtons() {
    for (const btn of this.root.querySelectorAll('.size-btn')) {
      btn.classList.toggle('active', btn.dataset.size === this.state.size);
    }
  }

  syncPanelControls() {
    const panel = this.state.panels[this.selected];
    const label = this.root.querySelector('#selectedPanel');
    if (label) {
      label.textContent = panel ? `Panel ${this.selected + 1} of ${this.state.panels.length}` : 'No panel';
    }
    const zoom = this.root.querySelector('#zoomRange');
    if (zoom && panel) zoom.value = String(Math.round(panel.zoom * 100));
    for (const thumb of this.root.querySelectorAll('.thumb')) {
      thumb.classList.toggle('in-panel', Number(thumb.dataset.photo) === panel?.photo);
    }
  }

  // Rebuild the photo tray thumbnails.
  renderTray() {
    const tray = this.root.querySelector('#photoTray');
    if (!tray) return;
    tray.innerHTML = '';
    this.tray.photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.dataset.photo = String(index);
      button.title = `${photo.name} — click to put it in the selected panel`;
      const img = document.createElement('img');
      img.src = photo.img.src;
      img.alt = photo.name;
      const caption = document.createElement('span');
      caption.textContent = photo.name;
      button.append(img, caption);
      button.addEventListener('click', () => this.assignPhoto(index));
      tray.appendChild(button);
    });
    this.syncPanelControls();
  }

  // ---- wiring ----

  wireControls() {
    const $ = (sel) => this.root.querySelector(sel);

    for (const btn of this.root.querySelectorAll('.layout-btn')) {
      btn.addEventListener('click', () => this.setLayout(btn.dataset.layout));
    }
    for (const btn of this.root.querySelectorAll('.grade-btn')) {
      btn.addEventListener('click', () => this.setGrade(btn.dataset.grade));
    }
    for (const btn of this.root.querySelectorAll('.size-btn')) {
      btn.addEventListener('click', () => this.setSize(btn.dataset.size));
    }

    const gradeSlider = $('#gradeStrength');
    gradeSlider?.addEventListener('input', () => {
      this.state.gradeStrength = Number(gradeSlider.value) / 100;
      this.render();
    });

    const captionInput = $('#captionInput');
    captionInput?.addEventListener('input', () => {
      this.state.caption = captionInput.value;
      this.render();
    });
    const subtitleInput = $('#subtitleInput');
    subtitleInput?.addEventListener('input', () => {
      this.state.subtitle = subtitleInput.value;
      this.render();
    });
    const captionScale = $('#captionScale');
    captionScale?.addEventListener('input', () => {
      this.state.captionScale = Number(captionScale.value) / 100;
      this.render();
    });

    const zoom = $('#zoomRange');
    zoom?.addEventListener('input', () => {
      const panel = this.state.panels[this.selected];
      if (!panel) return;
      panel.zoom = Number(zoom.value) / 100;
      const { w, h } = this.exportSize();
      const { rects } = coverGeometry(w, h, this.state.layout);
      const image = this.tray.get(panel.photo);
      if (image) clampPan(panel, rects[this.selected], image.img);
      this.render();
    });

    $('#fillAll')?.addEventListener('click', () => this.fillAllWithSelected());
    $('#exportBtn')?.addEventListener('click', () => this.exportPNG());

    const picker = $('#addPhotos');
    picker?.addEventListener('change', async () => {
      const files = [...picker.files];
      for (const file of files) {
        try {
          const index = await this.tray.addFile(file);
          this.assignPhoto(index);
        } catch {
          this.showToast(`Could not load ${file.name}`);
        }
      }
      picker.value = '';
    });

    // Drag photos in from the desktop, onto the stage or the tray.
    const dropTargets = [this.canvas, $('#photoTray')].filter(Boolean);
    for (const target of dropTargets) {
      target.addEventListener('dragover', (event) => {
        event.preventDefault();
        target.classList.add('dropping');
      });
      target.addEventListener('dragleave', () => target.classList.remove('dropping'));
      target.addEventListener('drop', async (event) => {
        event.preventDefault();
        target.classList.remove('dropping');
        for (const file of [...event.dataTransfer.files]) {
          try {
            const index = await this.tray.addFile(file);
            this.assignPhoto(index);
          } catch {
            this.showToast(`Could not load ${file.name}`);
          }
        }
      });
    }

    // Drag on the canvas to pan the photo inside the panel under the cursor.
    this.canvas.addEventListener('pointerdown', (event) => {
      const point = this.toCanvasPixels(event);
      const hit = this.panelAt(point.x, point.y);
      if (hit < 0) return;
      this.selectPanel(hit);
      this.drag = { startX: point.x, startY: point.y, moved: false };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.drag) return;
      const point = this.toCanvasPixels(event);
      const panel = this.state.panels[this.selected];
      const { w, h } = this.exportSize();
      const { rects } = coverGeometry(w, h, this.state.layout);
      const rect = rects[this.selected];
      const image = this.tray.get(panel.photo);
      if (!panel || !rect || !image) return;
      panel.ox += (point.x - this.drag.startX) / rect.w;
      panel.oy += (point.y - this.drag.startY) / rect.h;
      clampPan(panel, rect, image.img);
      this.drag.startX = point.x;
      this.drag.startY = point.y;
      this.drag.moved = true;
      this.render();
    });
    const endDrag = () => {
      this.drag = null;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
  }

  // Load the bundled samples, wire the controls, paint the first preview.
  async boot() {
    await document.fonts.load('100px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
    this.tray.onChange(() => this.renderTray());
    await this.tray.loadSamples();
    this.wireControls();
    this.syncLayoutButtons();
    this.syncGradeButtons();
    this.syncSizeButtons();
    this.syncPanelControls();
    this.render();
  }
}
