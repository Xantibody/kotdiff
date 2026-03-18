export interface ActionPort {
  setBadge(text: string, color: string): Promise<void>;
  onClicked(handler: (tabId: number) => void): void;
}
