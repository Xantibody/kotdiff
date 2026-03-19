import type {
  ContextMenusPort,
  ContextMenuCreateProps,
  ContextMenuInfo,
} from "../ports/ContextMenusPort";

export const chromeContextMenusAdapter = {
  create(props: ContextMenuCreateProps): void {
    chrome.contextMenus.create({
      id: props.id,
      title: props.title,
      ...(props.type !== undefined ? { type: props.type } : {}),
      ...(props.contexts !== undefined
        ? {
            contexts: [...props.contexts] as [
              chrome.contextMenus.ContextType,
              ...chrome.contextMenus.ContextType[],
            ],
          }
        : {}),
      ...(props.checked !== undefined ? { checked: props.checked } : {}),
    });
  },

  onClicked(handler: (info: ContextMenuInfo, tabId?: number) => void): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      const menuInfo: ContextMenuInfo = { menuItemId: info.menuItemId };
      if (info.checked !== undefined) menuInfo.checked = info.checked;
      handler(menuInfo, tab?.id);
    });
  },
} satisfies ContextMenusPort;
