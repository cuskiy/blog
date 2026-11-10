import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { transform } from "esbuild";

const dist = "dist";
const failures: string[] = [];

function fail(where: string, message: string): void {
  failures.push(`${where}: ${message}`);
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await walk(path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

function checkTags(where: string, html: string): void {
  const stack: string[] = [];
  for (const match of html.matchAll(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const [whole, name, attributes] = match;
    if (name === undefined || attributes === undefined) {
      continue;
    }
    if (whole.startsWith("</")) {
      const open = stack.pop();
      if (open !== name) {
        fail(where, `</${name}> closes <${open ?? "nothing"}>`);
        return;
      }
      continue;
    }
    if (!voidTags.has(name) && !attributes.endsWith("/")) {
      stack.push(name);
    }
  }
  if (stack.length > 0) {
    fail(where, `unclosed ${stack.join(", ")}`);
  }
}

function checkHtml(where: string, html: string, files: Set<string>): void {
  checkTags(where, html);

  if (/<style\b/i.test(html)) fail(where, "inline <style>");
  if (/\sstyle\s*=/i.test(html)) fail(where, "inline style attribute");
  if (/\son[a-z]+\s*=/i.test(html)) fail(where, "inline event handler");
  if (/<script\b(?![^>]*\bsrc=)/i.test(html)) fail(where, "inline <script>");

  const headings = [...html.matchAll(/<h([1-6])\b/gu)].map((match) => Number(match[1]));
  if (headings.filter((level) => level === 1).length !== 1) {
    fail(where, `expected one h1, found ${headings.filter((level) => level === 1).length}`);
  }
  for (const [index, level] of headings.entries()) {
    const previous = headings[index - 1];
    if (previous !== undefined && level > previous + 1) {
      fail(where, `heading jumps from h${previous} to h${level}`);
    }
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
  const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicated.length > 0) fail(where, `duplicate id ${duplicated.join(", ")}`);

  for (const [tag] of html.matchAll(/<img\b[^>]*>/gu)) {
    for (const attribute of ["alt=", "width=", "height="]) {
      if (!tag.includes(attribute)) fail(where, `<img> without ${attribute.slice(0, -1)}`);
    }
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gu)) {
    if (!tag.includes("href=")) fail(where, "<a> without href");
  }
  for (const [tag] of html.matchAll(/<button\b[^>]*>/gu)) {
    if (!tag.includes("type=")) fail(where, "<button> without type");
  }

  if (html.includes("<main") && (html.match(/<main\b/gu) ?? []).length !== 1) {
    fail(where, "expected exactly one <main>");
  }
  for (const [tag] of html.matchAll(/<nav\b[^>]*>/gu)) {
    if (!tag.includes("aria-label=")) fail(where, "<nav> without aria-label");
  }

  for (const [, value] of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/gu)) {
    const path = decodeURIComponent(value ?? "");
    const target = path.endsWith("/") ? `${path}index.html` : path;
    if (!files.has(target.slice(1))) fail(where, `missing ${target}`);
  }
}

async function main(): Promise<void> {
  const paths = await walk(dist);
  const files = new Set(paths.map((path) => path.slice(dist.length + 1)));
  const html = paths.filter((path) => path.endsWith(".html"));
  const css = paths.find((path) => path.endsWith(".css"));

  if (html.length === 0) fail(dist, "no html produced");

  if (!files.has("robots.txt")) {
    fail(dist, "no robots.txt");
  } else if (!(await readFile(join(dist, "robots.txt"), "utf8")).includes("Disallow: /")) {
    fail("robots.txt", "does not disallow every crawler");
  }

  for (const page of html) {
    checkHtml(page, await readFile(page, "utf8"), files);
  }

  const source = css === undefined ? undefined : await readFile(css, "utf8");
  if (css === undefined || source === undefined) {
    fail(dist, "no stylesheet produced");
  } else {
    try {
      await transform(source, { loader: "css" });
    } catch (error) {
      fail(css, `does not parse: ${String(error)}`);
    }
    if (source.includes("!important")) fail(css, "!important");
    // the token block must hang off :root itself: scoping it to a variant strips every colour
    const root = /:root\s*\{([^}]*)\}/u.exec(source);
    if (root === null || !(root[1] ?? "").includes("--page:")) {
      fail(css, "tokens missing from :root");
    }
    if (/-(?:webkit|moz|ms|o)-[a-z]/u.test(source)) fail(css, "vendor prefix");
    if (source.includes("sourceMappingURL")) fail(css, "source map reference");

    // a file name inside url(...) reads as a class name, so it comes out first
    const withoutUrls = source.replace(/url\([^)]*\)/gu, "");
    const declared = new Set(
      [...withoutUrls.matchAll(/\.([a-zA-Z][\w-]*)/gu)].map((match) => match[1]).filter((name) => name !== undefined),
    );
    // markup also lives in the templates, and some of it only appears in certain builds
    const markup = [...html, ...(await walk("src")).filter((path) => path.endsWith(".ts"))];
    const used = new Set<string>();
    for (const file of markup) {
      for (const [, group] of (await readFile(file, "utf8")).matchAll(/class="([^"]+)"/gu)) {
        for (const name of (group ?? "").split(" ")) {
          if (name !== "") used.add(name);
        }
      }
    }
    for (const name of used) {
      if (!declared.has(name) && !name.startsWith("align-") && !name.startsWith("language-")) {
        fail("css", `no rule for .${name}`);
      }
    }
    for (const name of declared) {
      if (!used.has(name)) fail("css", `.${name} is never used`);
    }
  }

  // only the bundles built from our sources; the vendored worklet is copied verbatim
  for (const script of paths.filter((path) => path.endsWith(".js") && !path.includes("spessasynth_processor"))) {
    const code = await readFile(script, "utf8");
    if (code.length === 0) fail(script, "empty");
    if (/sourceMappingURL|eval\(|new Function\(/u.test(code)) fail(script, "unexpected code");
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`output ok: ${html.length} pages, ${files.size} files`);
}

await main();
