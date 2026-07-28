// 注入 UI は React ではなく素の DOM で組み立てる。要素生成の定型を短くするための最小ヘルパー。
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style !== undefined && style !== "") {
    node.style.cssText = style;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

export function append<T extends HTMLElement>(parent: T, ...children: readonly HTMLElement[]): T {
  for (const child of children) {
    parent.append(child);
  }
  return parent;
}
