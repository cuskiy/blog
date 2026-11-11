import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build as esbuild } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";

import { pageUrl } from "./components/pagination.ts";
import { searchIndexUrl } from "./lib/assets.ts";
import type { Assets } from "./lib/assets.ts";
import { perPage, routes, site } from "./lib/config.ts";
import { collectTags, loadMemos, loadPages, loadPosts, loadTracks, searchIndex } from "./lib/content/index.ts";
import { assertDistinct, hashId, indexFile } from "./lib/ids.ts";
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
const lock = join(root, "dist.lock");

async function emit(path: string, content: string): Promise<void> {
  // a leading slash belongs to the address, not to the path inside dist
  const target = join(staging, path.replace(/^\//u, ""));
  await mkdir(dirname(target), { recursive: true });
  const body = path.endsWith(".html")
    ? await minifyHtml(content, { collapseWhitespace: true, removeComments: true })
    : content;
  await writeFile(target, body, "utf8");
}

// the name is the content: nothing readable, and a cached copy can never be stale
async function writeAsset(dir: string, extension: string, contents: Uint8Array): Promise<string> {
  const file = `${hashId(contents)}${extension}`;
  const target = join(staging, dir, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
  return `/${dir}/${file}`;
}

// a file that is copied as it stands: same rule, the id comes from the bytes
async function copyAsset(source: string): Promise<string> {
  return writeAsset("assets", extname(source), await readFile(join(root, "src/assets", source)));
}

async function compileStyle(): Promise<Uint8Array> {
  const output = await esbuild({
    entryPoints: [join(root, "src/assets/style.css")],
    bundle: false,
    minify: true,
    target: "esnext",
    write: false,
    logLevel: "silent",
  });
  const [file] = output.outputFiles;
  if (file === undefined) {
    throw new Error("esbuild produced no stylesheet");
  }
  return file.contents;
}

interface ScriptOptions {
  readonly format: "esm" | "iife";
  readonly define?: Readonly<Record<string, string>>;
}

// Splitting keeps the heavy music player off the critical path: the entry stays tiny and the
// chunks arrive when they are imported, each under its own content hash.
interface CompiledScript {
  readonly entry: { readonly name: string; readonly contents: Uint8Array };
  readonly files: readonly { readonly name: string; readonly contents: Uint8Array }[];
}

// The bundle names itself after its contents, and points at its chunks by name, so the
// names have to be esbuild's own: ours would break the imports it writes.
async function compileScript(name: string, { format, define }: ScriptOptions): Promise<CompiledScript> {
  const output = await esbuild({
    entryPoints: [join(root, "src/client", `${name}.ts`)],
    bundle: true,
    splitting: format === "esm",
    format,
    minify: true,
    target: "esnext",
    write: false,
    logLevel: "silent",
    outdir: "assets/js",
    entryNames: "[hash]",
    chunkNames: "[hash]",
    metafile: true,
    ...(define === undefined ? {} : { define }),
  });

  const files = output.outputFiles.map((file) => ({ name: basename(file.path), contents: file.contents }));
  const entryName = Object.entries(output.metafile.outputs).find(
    ([, summary]) => summary.entryPoint !== undefined,
  )?.[0];
  const entry = files.find((file) => file.name === basename(entryName ?? ""));
  if (entry === undefined) {
    throw new Error(`esbuild produced no entry for ${name}`);
  }
  return { entry, files };
}

async function emitScript(name: string, options: ScriptOptions): Promise<string> {
  const { entry, files } = await compileScript(name, options);
  for (const file of files) {
    const target = join(staging, "assets", "js", file.name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.contents);
  }
  return `/assets/js/${entry.name}`;
}

// the worklet is fetched by URL from inside the player, so it carries its own hash: a cached
// copy can never end up paired with a newer library
async function emitProcessor(): Promise<string> {
  const source = await readFile(join(root, "node_modules", "spessasynth_lib", "dist", "spessasynth_processor.min.js"));
  return writeAsset("assets/processor", ".js", source);
}

async function emitWorker(version: string): Promise<void> {
  const { files } = await compileScript("sw", {
    format: "iife",
    define: { __ASSET_VERSION__: JSON.stringify(version) },
  });
  const [worker] = files;
  if (worker === undefined || files.length !== 1) {
    throw new Error("the service worker must compile to exactly one file");
  }
  // registered by URL, so this one file keeps a stable name
  await writeFile(join(staging, "sw.js"), worker.contents);
}

async function bundle(): Promise<Assets> {
  const processor = await emitProcessor();
  const define = { __PROCESSOR_URL__: JSON.stringify(processor) };

  const scripts: Assets["scripts"] = {
    music: await emitScript("music", { format: "esm", define }),
    search: await emitScript("search", { format: "esm" }),
    oneko: await emitScript("oneko", { format: "iife" }),
    about: await emitScript("about", { format: "esm" }),
  };

  const css = await writeAsset("assets", ".css", await compileStyle());
  const favicon = await copyAsset("favicon.ico");
  const icons = [
    { src: await copyAsset("icon-192.png"), sizes: "192x192", type: "image/png" },
    { src: await copyAsset("icon-512.png"), sizes: "512x512", type: "image/png" },
  ];
  const art = await copyAsset("music/lineart.webp");

  const avatars: Record<string, string> = {};
  for (const file of await readdir(join(root, "src/assets", "avatar"))) {
    avatars[file] = await copyAsset(join("avatar", file));
  }
  for (const friend of friends) {
    if (avatars[friend.avatar] === undefined) {
      throw new Error(`${friend.avatar}: listed in links.ts but missing from src/assets/avatar`);
    }
  }

  // the worker stamps its asset cache with this, so a deploy retires the previous one
  await emitWorker(hashId([css, ...Object.values(scripts), ...Object.values(avatars)].join(" ")));

  // the tracks and the font are large and are addressed by name, so they keep their names
  for (const asset of ["midi", "soundfont"]) {
    await cp(join(root, "static", asset), join(staging, "assets", asset), { recursive: true });
  }
  await cp(join(root, "static", "robots.txt"), join(staging, "robots.txt"));

  // the site's own avatar is a blogroll address, so it is published as it stands
  const siteAvatar = "/assets/cuskiy.svg";
  await cp(join(root, "static", "cuskiy.svg"), join(staging, siteAvatar.slice(1)));

  return { css, scripts, favicon, icons, art, siteAvatar, avatars };
}

async function render(assets: Assets): Promise<number> {
  const posts = await loadPosts(join(root, "content", "posts"));
  const memos = await loadMemos(join(root, "content", "memos"));
  const pages = await loadPages(join(root, "content", "pages"));
  const tags = collectTags(posts);

  const postPages = paginate(posts, perPage.posts);
  for (const [index, chunk] of postPages.entries()) {
    const position = { page: index + 1, total: postPages.length };
    await emit(indexFile(pageUrl(routes.home, position.page)), postsPage(chunk, position, assets));
  }

  const memoPages = paginate(memos, perPage.memos);
  for (const [index, chunk] of memoPages.entries()) {
    const position = { page: index + 1, total: memoPages.length };
    await emit(indexFile(pageUrl(routes.memos, position.page)), memoPage(chunk, position, assets));
  }

  await emit("feed.xml", feed(posts));
  await emit("manifest.webmanifest", JSON.stringify(manifest(assets), null, 2));
  await emit("404.html", notFoundPage(assets));
  await emit(indexFile(routes.about), aboutPage(assets));
  await emit(indexFile(routes.links), linksPage(assets));
  await emit(indexFile(routes.tags), tagIndexPage(tags, assets));
  await emit(indexFile(routes.search), searchPage(assets));
  await emit(indexFile(routes.music), musicPage(await loadTracks(join(root, "static", "midi")), assets));
  await emit(searchIndexUrl, JSON.stringify(searchIndex(posts, memos)));

  // every address below was decided when the file was read; nothing here builds a path
  const entries = [
    ...pages.map((page) => ({ name: `${page.slug}.dj`, route: page.route, render: () => pagePage(page, assets) })),
    ...tags.map((tag) => ({ name: `tag ${tag.name}`, route: tag.route, render: () => tagPage(tag, assets) })),
    ...posts.map((post, index) => ({
      name: `${post.slug}.dj`,
      route: post.route,
      render: () => postPage({ post, older: posts[index + 1], newer: posts[index - 1] }, assets),
    })),
  ];

  assertDistinct(entries);

  for (const entry of entries) {
    await emit(entry.route.file, entry.render());
    console.log(`  ${entry.name} → ${entry.route.url}`);
  }

  return posts.length;
}

export async function build(): Promise<number> {
  // the feed and the links page build absolute links, so the origin has to be a bare one
  if (new URL(site.url).pathname !== "/") {
    throw new Error(`site.url must be a bare origin, got ${JSON.stringify(site.url)}`);
  }

  // two builds sharing one staging directory would interleave and leave a mixed dist behind
  await writeFile(lock, "", { flag: "wx" }).catch(() => {
    throw new Error(`another build is running, or ${basename(lock)} was left behind by a crashed one`);
  });

  try {
    await rm(staging, { recursive: true, force: true });
    const count = await render(await bundle());

    const previous = `${dist}.old`;
    await rm(previous, { recursive: true, force: true });
    try {
      await rename(dist, previous);
    } catch {
      // the first build has nothing to move aside
    }
    await rename(staging, dist);
    await rm(previous, { recursive: true, force: true });

    return count;
  } finally {
    await rm(lock, { force: true });
  }
}
