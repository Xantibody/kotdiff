export interface DomReadyPort {
  isAlreadyInjected(markerClass: string): boolean;
  querySelector<T extends Element>(selector: string): T | null;
  querySelectorAll<T extends Element>(selector: string): T[];
  createElement<const K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K];
  waitForElement(selector: string, onFound: (el: Element) => void): void;
  reload(): void;
}
