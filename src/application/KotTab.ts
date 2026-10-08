import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import { KOT_URL, KOT_URL_PATTERN } from "../infrastructure/chrome/constants";

// 既に開いている KOT のタブがあればそれを前に出し、なければ新しく開く
export async function openKotTab(tabs: TabsPort): Promise<void> {
  const tabIds = await tabs.queryByUrl(KOT_URL_PATTERN);
  if (tabIds.length > 0 && tabIds[0] !== undefined) {
    await tabs.activateTab(tabIds[0]);
  } else {
    await tabs.openTab(KOT_URL);
  }
}
