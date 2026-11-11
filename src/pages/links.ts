import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import { routes } from "../lib/config.ts";
import { site } from "../lib/config.ts";
import { html } from "../lib/html.ts";
import { friends } from "../lib/links.ts";

// the build fails when a friend's avatar is missing, so this can only fire on a build bug
function avatar(assets: Assets, file: string): string {
  const url = assets.avatars[file];
  if (url === undefined) {
    throw new Error(`${file}: no asset was emitted for this avatar`);
  }
  return url;
}

export function linksPage(assets: Assets): string {
  const cards = friends.map(
    (friend) =>
      html`    <li class="friend">
      <img src="${avatar(assets, friend.avatar)}" alt="${friend.name}" width="48" height="48" loading="lazy" decoding="async">
      <a href="${friend.url}" rel="noopener"><strong>${friend.name}</strong></a>
      <span>${friend.note}</span>
    </li>`,
  );

  return layout({
    assets,
    title: "友链",
    path: routes.links,
    heading: "友链",
    body: html`  <ul class="friend-list" aria-label="友链">
${cards}
  </ul>

  <h2 class="list-title">本站信息</h2>
  <div class="site-card">
    <dl>
      <dt>头像</dt>
      <dd>${site.url}${avatar(assets, "cuskiy.svg")}</dd>
      <dt>标题</dt>
      <dd>${site.title}</dd>
      <dt>座右铭</dt>
      <dd>${site.motto}</dd>
    </dl>
  </div>`,
  });
}
