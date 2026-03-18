import type {
  ContextMenusPort,
  ContextMenuCreateProps,
  ContextMenuInfo,
} from "../ports/ContextMenusPort";

export const chromeContextMenusAdapter: ContextMenusPort = {
  create(props: ContextMenuCreateProps): void {
    chrome.contextMenus.create({
      id: props.id,
      title: props.title,
      type: props.type,
      contexts: props.contexts as chrome.contextMenus.ContextType[] | undefined,
      checked: props.checked,
    });
  },

  onClicked(handler: (info: ContextMenuInfo, tabId?: number) => void): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      handler({ menuItemId: info.menuItemId, checked: info.checked }, tab?.id);
    });
  },
};
