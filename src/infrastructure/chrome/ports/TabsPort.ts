export interface TabsPort {
  openTab(url: string): Promise<void>;
  sendToTab(tabId: number, message: unknown): Promise<void>;
}
