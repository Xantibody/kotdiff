export interface DomReadyPort {
  isAlreadyInjected(markerClass: string): boolean;
  querySelector<T extends Element>(selector: string): T | null;
  querySelectorAll<T extends Element>(selector: string): T[];
  createElement<T extends HTMLElement>(tag: string): T;
  waitForElement(selector: string, onFound: (el: Element) => void): void;
  reload(): void;
}
