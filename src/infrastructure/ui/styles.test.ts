import { describe, test, expect, beforeEach } from "vitest";

import { injectStyles, KOTDIFF_MARKER_CLASS, KOTDIFF_STYLE_ID, KOTDIFF_CARD_CLASS } from "./styles";

describe("injectStyles", () => {
  beforeEach(() => {
    document.querySelector(`#${KOTDIFF_STYLE_ID}`)?.remove();
  });

  test("appends a style element with id kotdiff-styles to document.head", () => {
    injectStyles();
    const style = document.querySelector(`#${KOTDIFF_STYLE_ID}`);
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe("STYLE");
    expect(style?.parentElement).toBe(document.head);
  });

  test("does not add the kotdiff marker class to the style element", () => {
    injectStyles();
    const style = document.querySelector(`#${KOTDIFF_STYLE_ID}`);
    expect(style?.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(false);
  });

  test("second call does not duplicate the style element", () => {
    injectStyles();
    injectStyles();
    expect(document.querySelectorAll(`#${KOTDIFF_STYLE_ID}`).length).toBe(1);
  });

  test("v2 mode ships the card rules instead of the legacy banner rules", () => {
    injectStyles("v2");
    const css = document.querySelector(`#${KOTDIFF_STYLE_ID}`)?.textContent ?? "";
    expect(css).toContain(`div.${KOTDIFF_CARD_CLASS}`);
    expect(css).not.toContain(`div.${KOTDIFF_MARKER_CLASS} {`);
  });

  test("rewrites the rules when the mode changes without reloading the page", () => {
    injectStyles("legacy");
    injectStyles("v2");
    const css = document.querySelector(`#${KOTDIFF_STYLE_ID}`)?.textContent ?? "";
    expect(css).toContain(`div.${KOTDIFF_CARD_CLASS}`);
    expect(document.querySelectorAll(`#${KOTDIFF_STYLE_ID}`).length).toBe(1);
  });
});
