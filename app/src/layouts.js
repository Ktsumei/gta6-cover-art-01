// Panel layouts for the cover: each layout names its slots and where they sit
// inside the cover, as fractions of the cover's width and height. The cover
// itself is drawn inside a white poster frame, so these rects are relative to
// the framed area, not the whole canvas.

export const LAYOUTS = {
  hero: {
    label: 'Hero + two',
    slots: 3,
    rects: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.62 },
      { x: 0.0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  trio: {
    label: 'Three columns',
    slots: 3,
    rects: [
      { x: 0.0, y: 0.0, w: 1 / 3, h: 1.0 },
      { x: 1 / 3, y: 0.0, w: 1 / 3, h: 1.0 },
      { x: 2 / 3, y: 0.0, w: 1 / 3, h: 1.0 },
    ],
  },
  duo: {
    label: 'Two panels',
    slots: 2,
    rects: [
      { x: 0.0, y: 0.0, w: 0.5, h: 1.0 },
      { x: 0.5, y: 0.0, w: 0.5, h: 1.0 },
    ],
  },
  solo: {
    label: 'Single hero',
    slots: 1,
    rects: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
  },
};

export const LAYOUT_ORDER = ['hero', 'trio', 'duo', 'solo'];

// Turn a layout's relative rects into pixel rects inside the framed area,
// cutting a white gutter out of every shared edge so the panels read as
// separate poster tiles.
export function panelRects(layoutName, areaX, areaY, areaW, areaH, gutter) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.hero;
  const half = gutter / 2;
  return layout.rects.map((r) => {
    const px = areaX + r.x * areaW;
    const py = areaY + r.y * areaH;
    const pw = r.w * areaW;
    const ph = r.h * areaH;
    const insetLeft = r.x > 0 ? half : 0;
    const insetTop = r.y > 0 ? half : 0;
    const insetRight = r.x + r.w < 1 ? half : 0;
    const insetBottom = r.y + r.h < 1 ? half : 0;
    return {
      x: px + insetLeft,
      y: py + insetTop,
      w: pw - insetLeft - insetRight,
      h: ph - insetTop - insetBottom,
    };
  });
}

// How many photo slots a layout has.
export function slotCount(layoutName) {
  return (LAYOUTS[layoutName] ?? LAYOUTS.hero).slots;
}
