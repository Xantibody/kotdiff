import type { KotdiffMessage } from "../../../application/types";

export interface TabsPort {
  openTab(url: string): Promise<void>;
  sendToTab(tabId: number, message: KotdiffMessage): Promise<void>;
}
