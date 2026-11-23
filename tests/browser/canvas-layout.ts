import type { Locator } from '@playwright/test';

export async function waitForCanvasLayout(target: Locator) {
  await target.evaluate(async (element) => {
    const canvas = document.querySelector<HTMLElement>('.interactive-canvas')!;
    const world = canvas.querySelector<SVGGraphicsElement>('.canvas-svg > g')!;
    let previous = '',
      stable = 0;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const box = canvas.getBoundingClientRect(),
        targetBox = element.getBoundingClientRect(),
        matrix = world.getScreenCTM()!,
        camera = JSON.parse(canvas.getAttribute('data-camera')!);
      const center = new DOMPoint(camera.x, camera.y).matrixTransform(matrix);
      const snapshot = JSON.stringify({
        canvas: [box.x, box.y, box.width, box.height],
        target: [targetBox.x, targetBox.y, targetBox.width, targetBox.height],
        camera,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
      });
      // ResizeObserver updates the viewport before its SVG repaint. Raw mouse
      // coordinates must agree with both the rendered scene and the host.
      const aligned =
        Math.abs(center.x - box.x - box.width / 2) < 0.5 &&
        Math.abs(center.y - box.y - box.height / 2) < 0.5;
      stable = aligned ? (snapshot === previous ? stable + 1 : 1) : 0;
      if (stable >= 4) return;
      previous = snapshot;
    }
    throw new Error('The canvas and its rendered geometry did not settle');
  });
}
