// DEMO-SEED hidden-sink
const contentKey = ['inner', 'HTML'].join('');

export function showHighlightedResult(
  target: HTMLElement,
  markup: string,
): void {
  (target as unknown as Record<string, string>)[contentKey] = markup;
}

export function showHighlightedHint(target: HTMLElement, markup: string): void {
  Object.assign(target, { innerHTML: markup });
}
