const KOT_HOST = "kingoftime.jp";

// その URL が KOT のページ（content script が注入される先）か。
// 認証情報を渡す相手を KOT のタブに限るために使うので、https とホスト名を厳密に見る
export function isKotPageUrl(url: string | null): boolean {
  if (url === null) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    (parsed.hostname === KOT_HOST || parsed.hostname.endsWith(`.${KOT_HOST}`))
  );
}
