export const automaticLayoutActions = [
  'hierarchy.top-down',
  'hierarchy.left-right',
  'flow.top-down',
  'flow.left-right',
] as const;

export type AutomaticLayoutAction = (typeof automaticLayoutActions)[number];

export function isAutomaticLayoutAction(
  action: string,
): action is AutomaticLayoutAction {
  return automaticLayoutActions.some((option) => option === action);
}
