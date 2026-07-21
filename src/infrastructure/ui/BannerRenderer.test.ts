import { describe, test, expect, beforeEach } from "vitest";

import { defined } from "../../test-utils";
import { createBannerElement, renderBannerLine, injectStyles } from "./BannerRenderer";
import { KOTDIFF_MARKER_CLASS, KOTDIFF_STYLE_ID } from "./styles";

describe("createBannerElement", () => {
  test("has correct marker class", () => {
    const div = createBannerElement();
    expect(div.tagName).toBe("DIV");
    expect(div.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
  });
});

describe("renderBannerLine", () => {
  test("plain text segment creates text node", () => {
    const container = document.createElement("div");
    renderBannerLine([{ text: "hello" }], container);
    const inner = container.querySelector("div");
    expect(inner).not.toBeNull();
    expect(inner?.textContent).toBe("hello");
    // Should not have a span for plain text
    expect(inner?.querySelector("span")).toBeNull();
  });

  test("bold segment creates span with fontWeight bold", () => {
    const container = document.createElement("div");
    renderBannerLine([{ text: "bold text", bold: true }], container);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("bold text");
    expect(span?.style.fontWeight).toBe("bold");
  });

  test("color segment creates span with color style", () => {
    const container = document.createElement("div");
    renderBannerLine([{ text: "colored", color: "red" }], container);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("colored");
    expect(span?.style.color).toBe("red");
  });

  test("mixed segments render correctly", () => {
    const container = document.createElement("div");
    renderBannerLine(
      [{ text: "plain " }, { text: "bold", bold: true }, { text: " colored", color: "green" }],
      container,
    );
    const inner = container.querySelector("div");
    expect(inner).not.toBeNull();
    const spans = inner?.querySelectorAll("span");
    expect(spans?.length).toBe(2);
    expect(defined(spans?.[0]).style.fontWeight).toBe("bold");
    expect(defined(spans?.[1]).style.color).toBe("green");
  });

  test("appends div to container", () => {
    const container = document.createElement("div");
    renderBannerLine([{ text: "line 1" }], container);
    renderBannerLine([{ text: "line 2" }], container);
    expect(container.querySelectorAll("div").length).toBe(2);
  });
});

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
});
