import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import { routes } from "../lib/config.ts";
import type { Track } from "../lib/content/index.ts";
import { html } from "../lib/html.ts";

export function musicPage(tracks: readonly Track[], assets: Assets): string {
  const rows = tracks.map(
    (track, index) => html`      <li>
        <button type="button" data-track="${track.file}" data-index="${index}">
          <span class="music-title">${track.title}</span>
          <span class="music-wave" aria-hidden="true">
            <span class="wave-drift wave-drift-far"></span>
            <span class="wave-drift wave-drift-near"></span>
          </span>
        </button>
      </li>`,
  );

  return layout({
    assets,
    title: "音乐",
    path: routes.music,
    heading: "音乐",
    script: assets.scripts.music,
    body: html`  <div class="music-room">
    <ol class="music-list" aria-label="曲目">
${rows}
    </ol>

    <figure class="music-art">
      <img src="${assets.art}" alt="线稿插画，作者 たんたんめん" width="1280" height="1634" loading="lazy" decoding="async">
    </figure>

    <noscript>
      <p class="noscript-note">音乐播放需要 JavaScript，开启后刷新页面即可。</p>
    </noscript>

    <footer class="music-credits">
      <dl>
        <dt>画师</dt>
        <dd>たんたんめん</dd>
        <dt>播放器</dt>
        <dd>SpessaSynth</dd>
        <dt>音源</dt>
        <dd>General User GS SoundFont</dd>
        <dt>来源</dt>
        <dd>MIDI 文件来自 <a href="https://www.midishow.com/" rel="noopener">midishow</a>，版权归原作者，仅供个人欣赏</dd>
      </dl>
    </footer>
  </div>`,
  });
}
