export type HexColor = `#${string}`;

export interface ActionPort {
  setBadge(text: string, color: HexColor): Promise<void>;
  onClicked(handler: (tabId: number) => void): void;
}
