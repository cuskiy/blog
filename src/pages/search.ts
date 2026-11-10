import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import { html } from "../lib/html.ts";

export function searchPage(assets: Assets): string {
  return layout({
    assets,
    title: "搜索",
    path: "/search/",
    heading: "搜索",
    script: assets.scripts.search,
    body: html`  <form class="search-form" role="search">
    <label class="visually-hidden" for="search-input">搜索内容</label>
    <input class="search-input" id="search-input" type="search" data-search autocomplete="off" placeholder="标题、标签或正文">
    <button class="search-submit" type="submit" aria-label="搜索">
      <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/></svg>
    </button>
  </form>

  <noscript>
    <p class="noscript-note">搜索需要 JavaScript，开启后刷新页面即可。</p>
  </noscript>

  <p class="post-count" data-search-count aria-live="polite"></p>
  <ul class="post-list" data-search-results aria-label="搜索结果"></ul>`,
  });
}
