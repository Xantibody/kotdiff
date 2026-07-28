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

  const store = {
    kotdiff_ui_preferences: {
      newUi: window.__KOTDIFF_NEW_UI__ !== false,
      bannerOpen: true,
      calendarOpen: true,
    },
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

  console.debug("[kotdiff-preview] newUi =", store.kotdiff_ui_preferences.newUi);
})();
