// DEMO-SEED xss
export function showRawResult(target: HTMLElement, html: string): void {
  target.innerHTML = html;
}
