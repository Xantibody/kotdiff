export interface TimerPort {
  // Returns a cleanup function
  setInterval(callback: () => void, ms: number): () => void;
  // Observe DOM removal and call onRemoved when element is removed
  observeRemoval(element: Element, onRemoved: () => void): () => void;
}
