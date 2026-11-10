import { createHash } from "node:crypto";
import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build as esbuild } from "esbuild";
import type { BuildOptions } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";

import type { Assets } from "./lib/assets.ts";
import { perPage, site } from "./lib/config.ts";
import { exists } from "./lib/fs.ts";
import { collectTags, loadMemos, loadPages, loadPosts, loadTracks, searchIndex } from "./lib/content/index.ts";
import { friends } from "./lib/links.ts";
import { manifest } from "./lib/manifest.ts";
import { paginate } from "./lib/paginate.ts";
import { aboutPage } from "./pages/about.ts";
import { feed } from "./pages/feed.ts";
import { postsPage } from "./pages/index.ts";
import { linksPage } from "./pages/links.ts";
import { memoPage } from "./pages/memo.ts";
import { musicPage } from "./pages/music.ts";
import { notFoundPage } from "./pages/not-found.ts";
import { pagePage } from "./pages/page.ts";
import { postPage } from "./pages/post.ts";
import { searchPage } from "./pages/search.ts";
import { tagIndexPage, tagPage } from "./pages/tags.ts";

export const root = fileURLToPath(new URL("..", import.meta.url));
export const dist = join(root, "dist");
const staging = join(root, "dist.tmp");

async function emit(path: string, content: string): Promise<void> {
  const target = join(staging, path);
  await mkdir(dirname(target), { recursive: true });
  const body = path.endsWith(".html")
    ? await minifyHtml(content, { collapseWhitespace: true, removeComments: true })
    : content;
  await writeFile(target, body, "utf8");
}

async function emitAsset(dir: string, name: string, extension: string, content: Uint8Array): Promise<string> {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
  const file = `${name}.${hash}.${extension}`;
  const target = join(staging, dir, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  return `/${dir}/${file}`;
}

async function compile(entry: string, format: "esm" | "iife" | "css"): Promise<Uint8Array> {
  const shared = {
    entryPoints: [entry],
    minify: true,
    target: "esnext",
    write: false,
    logLevel: "silent",
  } satisfies BuildOptions;
  const output = await esbuild(format === "css" ? { ...shared, bundle: false } : { ...shared, bundle: true, format });

  const file = output.outputFiles[0];
  if (file === undefined) {
    throw new Error(`esbuild produced no output for ${entry}`);
  }
  return file.contents;
}

async function bundle(): Promise<Assets> {
  const scripts: Assets["scripts"] = {
    music: await emitAsset("assets/js", "music", "js", await compile(join(root, "src/client/music.ts"), "esm")),
    search: await emitAsset("assets/js", "search", "js", await compile(join(root, "src/client/search.ts"), "esm")),
    oneko: await emitAsset("assets/js", "oneko", "js", await compile(join(root, "src/client/oneko.ts"), "iife")),
    about: await emitAsset("assets/js", "about", "js", await compile(join(root, "src/client/about.ts"), "esm")),
  };

  const css = await emitAsset("assets", "style", "css", await compile(join(root, "static/style.css"), "css"));

  // a service worker is registered by URL, so this one file keeps a stable name
  await writeFile(join(staging, "sw.js"), await compile(join(root, "src/client/sw.ts"), "iife"));

  for (const asset of ["avatar", "midi", "music", "soundfont"]) {
    await cp(join(root, "static", asset), join(staging, "assets", asset), { recursive: true });
  }
  for (const file of ["favicon.ico", "icon-192.png", "icon-512.png"]) {
    await cp(join(root, "static", file), join(staging, "assets", file));
  }
  await cp(join(root, "static", "robots.txt"), join(staging, "robots.txt"));
  await cp(
    join(root, "node_modules", "spessasynth_lib", "dist", "spessasynth_processor.min.js"),
    join(staging, "assets", "js", "spessasynth_processor.min.js"),
  );

  return { css, scripts };
}

export async function build(): Promise<number> {
  // the feed and the links page build absolute links, so the origin has to be a bare one
  if (new URL(site.url).pathname !== "/") {
    throw new Error(`site.url must be a bare origin, got ${JSON.stringify(site.url)}`);
  }

  // a friend card whose avatar is missing would ship a broken image
  for (const friend of friends) {
    if (!(await exists(join(root, "static", "avatar", friend.avatar)))) {
      throw new Error(`${friend.avatar}: listed in links.ts but missing from static/avatar`);
    }
  }

  await rm(staging, { recursive: true, force: true });

  const assets = await bundle();

  const posts = await loadPosts(join(root, "content", "posts"));
  const memos = await loadMemos(join(root, "content", "memos"));
  const pages = await loadPages(join(root, "content", "pages"));
  const tags = collectTags(posts);

  const postPages = paginate(posts, perPage.posts);
  for (const [index, chunk] of postPages.entries()) {
    const position = { page: index + 1, total: postPages.length };
    await emit(
      index === 0 ? "index.html" : join("page", String(index + 1), "index.html"),
      postsPage(chunk, position, assets),
    );
  }

  const memoPages = paginate(memos, perPage.memos);
  for (const [index, chunk] of memoPages.entries()) {
    const position = { page: index + 1, total: memoPages.length };
    await emit(
      index === 0 ? join("memo", "index.html") : join("memo", "page", String(index + 1), "index.html"),
      memoPage(chunk, position, assets),
    );
  }
  await emit("feed.xml", feed(posts));
  await emit("manifest.webmanifest", JSON.stringify(manifest, null, 2));
  await emit("404.html", notFoundPage(assets));
  await emit(join("about", "index.html"), aboutPage(assets));
  await emit(join("links", "index.html"), linksPage(assets));
  await emit(join("tags", "index.html"), tagIndexPage(tags, assets));
  await emit(join("search", "index.html"), searchPage(assets));
  await emit(join("music", "index.html"), musicPage(await loadTracks(join(root, "static", "midi")), assets));
  await emit(join("assets", "search.json"), JSON.stringify(searchIndex(posts, memos)));

  for (const page of pages) {
    await emit(join(page.slug, "index.html"), pagePage(page, assets));
  }
  for (const tag of tags) {
    await emit(join("tags", tag.name, "index.html"), tagPage(tag, assets));
  }
  for (const [index, post] of posts.entries()) {
    await emit(
      join("posts", post.slug, "index.html"),
      postPage({ post, older: posts[index + 1], newer: posts[index - 1] }, assets),
    );
  }

  const previous = `${dist}.old`;
  await rm(previous, { recursive: true, force: true });
  try {
    await rename(dist, previous);
  } catch {
    // the first build has nothing to move aside
  }
  await rename(staging, dist);
  await rm(previous, { recursive: true, force: true });

  return posts.length;
}
