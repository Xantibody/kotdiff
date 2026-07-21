import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { KOT_URL, KOT_URL_PATTERN } from "./constants";

function readManifestMatches(filename: string): string[] {
  const manifestPath = resolve(__dirname, "../../..", filename);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    content_scripts: { matches: string[] }[];
  };
  return manifest.content_scripts.flatMap((cs) => cs.matches);
}

describe("KOT URL constants", () => {
  // content_scripts の matches と queryByUrl のパターンが食い違うと、
  // 開いている KOT タブに一致せず常に新規タブが開かれてしまう (issue #18)
  test("KOT_URL_PATTERN matches manifest.chrome.json content_scripts", () => {
    expect(readManifestMatches("manifest.chrome.json")).toContain(KOT_URL_PATTERN);
  });

  test("KOT_URL_PATTERN matches manifest.firefox.json content_scripts", () => {
    expect(readManifestMatches("manifest.firefox.json")).toContain(KOT_URL_PATTERN);
  });

  test("KOT_URL points to the actual KOT domain", () => {
    expect(KOT_URL).toBe("https://s2.ta.kingoftime.jp/admin");
  });
});
