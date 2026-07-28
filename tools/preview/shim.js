// 保存済みの KOT ページで content script を動かすための最小スタブ。
// preview コマンドが差し込むだけで、拡張本体のビルドには含まれない。
(() => {
  // 一部の sample は拡張を入れたブラウザで保存されており、旧 UI の注入結果が残っている
  for (const el of document.querySelectorAll(".kotdiff-injected")) {
    el.remove();
  }

  // 旧バージョンで注入された「差分」列はマーカークラスを持たず上の掃除で残る。
  // 基準（所定 vs 8h）が今と違う値なので、並べて出ると新しい列と食い違って見える
  for (const table of document.querySelectorAll(".htBlock-adjastableTableF_inner > table")) {
    const headers = [...table.querySelectorAll("thead > tr > th")];
    const index = headers.findIndex((th) => th.textContent.trim() === "差分");
    if (index === -1) {
      continue;
    }
    headers[index].remove();
    for (const row of table.querySelectorAll("tbody > tr")) {
      row.querySelectorAll("td")[index]?.remove();
    }
  }

  // 新 UI の切り替えは本来ダッシュボードのトグルだが、preview はダッシュボードを
  // 描画しない。URL クエリで持たせて、ページ内のボタンから往復できるようにする
  // (file:// では localStorage が使えない環境があるためクエリを使う)
  const params = new URLSearchParams(window.location.search);
  const override = params.get("newUi");
  const newUi = override === null ? window.__KOTDIFF_NEW_UI__ !== false : override === "1";

  const store = {
    kotdiff_ui_preferences: { newUi, bannerOpen: true, calendarOpen: true },
  };

  window.chrome = {
    storage: {
      local: {
        get: async (key) => (typeof key === "string" ? { [key]: store[key] } : { ...store }),
        set: async (obj) => {
          Object.assign(store, obj);
        },
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
    runtime: {
      id: "kotdiff-preview",
      getURL: (path) => path,
      sendMessage: async () => {},
      onMessage: { addListener() {} },
    },
  };

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = `preview: 新 UI ${newUi ? "ON" : "OFF"}（クリックで切替）`;
  toggle.style.cssText =
    "position:fixed; right:16px; bottom:16px; z-index:2147483647; padding:8px 14px;" +
    "border:1px solid #cfd8d9; border-radius:999px; background:#fff; color:#00695c;" +
    "font:12px/1 'Meiryo UI', sans-serif; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.2);";
  toggle.addEventListener("click", () => {
    params.set("newUi", newUi ? "0" : "1");
    window.location.search = params.toString();
  });
  document.body.append(toggle);

  console.debug("[kotdiff-preview] newUi =", newUi);
})();
