// The photo tray: the user's photos plus the two bundled samples. Photos
// are read on this machine and never uploaded anywhere; a photo is an
// <img> element held in memory with its name and size.

export const SAMPLE_PHOTOS = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
];

export class PhotoTray {
  constructor() {
    this.photos = [];
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) fn(this.photos);
  }

  // Load one image file (a File from the picker or a drop) and add it.
  addFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('not an image'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.photos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), width: img.naturalWidth, height: img.naturalHeight });
          this.notify();
          resolve(this.photos.length - 1);
        };
        img.onerror = () => reject(new Error('could not read image'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('could not read file'));
      reader.readAsDataURL(file);
    });
  }

  // Load a bundled sample by relative path.
  addSample(sample) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.photos.push({ img, name: sample.name, width: img.naturalWidth, height: img.naturalHeight });
        this.notify();
        resolve(this.photos.length - 1);
      };
      img.onerror = () => reject(new Error(`could not load ${sample.src}`));
      img.src = sample.src;
    });
  }

  // Load every bundled sample, in order.
  async loadSamples() {
    for (const sample of SAMPLE_PHOTOS) {
      try {
        await this.addSample(sample);
      } catch {
        // A missing sample never blocks the editor; the user can add photos.
      }
    }
  }

  get(index) {
    return this.photos[index] ?? null;
  }

  // Plain image elements in load order, for the renderer.
  images() {
    return this.photos.map((p) => p.img);
  }
}
