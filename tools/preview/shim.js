// 保存済みの KOT ページで content script を動かすための最小スタブ。
// preview コマンドが差し込むだけで、拡張本体のビルドには含まれない。
(() => {
  // 一部の sample は拡張を入れたブラウザで保存されており、旧 UI の注入結果が残っている
  for (const el of document.querySelectorAll(".kotdiff-injected")) {
    el.remove();
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
