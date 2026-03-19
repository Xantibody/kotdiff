import { describe, test, expect } from "vitest";

import { defined } from "../../test-utils";
import { createBannerElement, renderBannerLine, injectStyles } from "./BannerRenderer";
import { KOTDIFF_MARKER_CLASS } from "./styles";

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
  test("appends a style element to document.head", () => {
    const beforeCount = document.head.querySelectorAll("style").length;
    injectStyles();
    const afterCount = document.head.querySelectorAll("style").length;
    expect(afterCount).toBe(beforeCount + 1);
  });

  test("style element has the kotdiff marker class", () => {
    injectStyles();
    const styles = document.head.querySelectorAll("style.kotdiff-injected");
    expect(styles.length).toBeGreaterThan(0);
  });
});
