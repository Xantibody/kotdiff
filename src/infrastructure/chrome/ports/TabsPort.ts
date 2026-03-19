import type { KotdiffMessage } from "../../../application/types";

export interface TabsPort {
  openTab(url: string): Promise<void>;
  sendToTab(tabId: number, message: KotdiffMessage): Promise<void>;
  queryByUrl(url: string): Promise<number[]>;
  activateTab(tabId: number): Promise<void>;
}
