export interface ContextMenuCreateProps {
  id: string;
  title: string;
  type?: "checkbox" | "normal" | "radio" | "separator";
  contexts?: string[];
  checked?: boolean;
}

export interface ContextMenuInfo {
  menuItemId: string | number;
  checked?: boolean;
}

export interface ContextMenusPort {
  create(props: ContextMenuCreateProps): void;
  onClicked(handler: (info: ContextMenuInfo, tabId?: number) => void): void;
}
