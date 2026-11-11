import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { routes } from "../config.ts";
import { renderDjot } from "../djot.ts";
import { exists } from "../fs.ts";
import { readMemoDate, readPageMeta, readPostMeta, splitFrontmatter } from "../frontmatter.ts";
import { hashId, route } from "../ids.ts";
import type { Memo, Page, Post, Track } from "./model.ts";
import { TRACKS } from "./music.ts";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function sourceFiles(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter((file) => file.endsWith(".dj")).toSorted();
}

function readSlug(file: string): string {
  const slug = file.slice(0, -".dj".length);
  if (!slugPattern.test(slug)) {
    throw new Error(`${file}: the file name may only use lowercase letters, digits and dashes`);
  }
  return slug;
}

export async function loadPosts(dir: string): Promise<Post[]> {
  const files = await sourceFiles(dir);
  const posts: Post[] = [];

  for (const file of files) {
    const slug = readSlug(file);
    const { fields, body } = splitFrontmatter(await readFile(join(dir, file), "utf8"), file);
    const meta = readPostMeta(fields, file);
    if (meta.draft) {
      continue;
    }

    posts.push({
      slug,
      route: route(routes.posts, slug),
      title: meta.title,
      date: meta.date,
      tags: meta.tags,
      summary: meta.summary,
      html: renderDjot(body, file),
    });
  }

  return posts.toSorted((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

export async function loadPages(dir: string): Promise<Page[]> {
  // the directory may be empty or absent: a site with no extra pages is a normal site
  if (!(await exists(dir))) {
    return [];
  }

  const pages: Page[] = [];
  for (const file of await sourceFiles(dir)) {
    const slug = readSlug(file);
    const { fields, body } = splitFrontmatter(await readFile(join(dir, file), "utf8"), file);
    const { title } = readPageMeta(fields, file);
    pages.push({ slug, route: route(routes.pages, slug), title, html: renderDjot(body, file) });
  }
  return pages;
}

export async function loadMemos(dir: string): Promise<Memo[]> {
  const files = await sourceFiles(dir);
  const memos: Memo[] = [];

  for (const file of files) {
    const slug = readSlug(file);
    const { fields, body } = splitFrontmatter(await readFile(join(dir, file), "utf8"), file);
    memos.push({
      slug,
      anchor: `m-${hashId(slug)}`,
      date: readMemoDate(fields, file),
      html: renderDjot(body, file),
    });
  }

  return memos.toSorted((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : a.date < b.date ? 1 : -1));
}

export async function loadTracks(dir: string): Promise<readonly Track[]> {
  const present = new Set((await readdir(dir)).filter((file) => file.endsWith(".mid")));

  for (const entry of TRACKS) {
    if (!present.has(entry.file)) {
      throw new Error(`${entry.file}: listed in music.ts but missing from ${dir}`);
    }
  }

  const listed = new Set(TRACKS.map((entry) => entry.file));
  for (const file of present) {
    if (!listed.has(file)) {
      throw new Error(`${file}: exists in ${dir} but has no entry in music.ts`);
    }
  }

  return TRACKS;
}
