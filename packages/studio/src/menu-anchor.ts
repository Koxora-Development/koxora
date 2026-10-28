export interface MenuAnchor {
  x: number;
  y: number;
  trigger: HTMLElement;
}

export function menuAnchor(
  trigger: HTMLElement,
  point?: { clientX: number; clientY: number },
): MenuAnchor {
  const box = trigger.getBoundingClientRect();
  return {
    trigger,
    x: point && (point.clientX || point.clientY) ? point.clientX : box.left,
    y: point && (point.clientX || point.clientY) ? point.clientY : box.bottom,
  };
}
