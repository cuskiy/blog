import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build as esbuild } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";

import type { Assets } from "./lib/assets.ts";
import { perPage, site } from "./lib/config.ts";
import { collectTags, loadMemos, loadPages, loadPosts, loadTracks, searchIndex } from "./lib/content/index.ts";
import { exists } from "./lib/fs.ts";
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

function hash(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

async function emit(path: string, content: string): Promise<void> {
  const target = join(staging, path);
  await mkdir(dirname(target), { recursive: true });
  const body = path.endsWith(".html")
    ? await minifyHtml(content, { collapseWhitespace: true, removeComments: true })
    : content;
  await writeFile(target, body, "utf8");
}

// a hashed name, so the browser and the service worker may cache it forever
async function emitHashed(dir: string, name: string, extension: string, content: Uint8Array): Promise<string> {
  const file = `${name}.${hash(content)}.${extension}`;
  const target = join(staging, dir, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  return `/${dir}/${file}`;
}

async function compileStyle(): Promise<Uint8Array> {
  const output = await esbuild({
    entryPoints: [join(root, "static/style.css")],
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
async function compileScript(
  name: string,
  { format, define }: ScriptOptions,
): Promise<readonly { readonly name: string; readonly contents: Uint8Array }[]> {
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
    entryNames: "[name].[hash]",
    chunkNames: "chunk.[hash]",
    ...(define === undefined ? {} : { define }),
  });
  return output.outputFiles.map((file) => ({ name: basename(file.path), contents: file.contents }));
}

async function emitScript(name: string, options: ScriptOptions): Promise<string> {
  let entry: string | undefined;

  for (const file of await compileScript(name, options)) {
    const target = join(staging, "assets", "js", file.name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.contents);
    if (file.name.startsWith(`${name}.`)) {
      entry = `/assets/js/${file.name}`;
    }
  }

  if (entry === undefined) {
    throw new Error(`esbuild produced no entry for ${name}`);
  }
  return entry;
}

// the worklet is fetched by URL from inside the player, so it carries its own hash: a cached
// copy can never end up paired with a newer library
async function emitProcessor(): Promise<string> {
  const source = await readFile(join(root, "node_modules", "spessasynth_lib", "dist", "spessasynth_processor.min.js"));
  return emitHashed("assets/js", "spessasynth_processor", "js", source);
}

async function emitWorker(version: string): Promise<void> {
  const files = await compileScript("sw", { format: "iife", define: { __ASSET_VERSION__: JSON.stringify(version) } });
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

  const css = await emitHashed("assets", "style", "css", await compileStyle());

  // the worker stamps its asset cache with this, so a deploy retires the previous one
  await emitWorker(hash([css, ...Object.values(scripts)].join(" ")));

  for (const asset of ["avatar", "midi", "music", "soundfont"]) {
    await cp(join(root, "static", asset), join(staging, "assets", asset), { recursive: true });
  }
  for (const file of ["favicon.ico", "icon-192.png", "icon-512.png"]) {
    await cp(join(root, "static", file), join(staging, "assets", file));
  }
  await cp(join(root, "static", "robots.txt"), join(staging, "robots.txt"));

  return { css, scripts };
}

async function render(assets: Assets): Promise<number> {
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

  return posts.length;
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
