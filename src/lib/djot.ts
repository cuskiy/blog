import { parse, renderHTML } from "@djot/djot";
import type { Cell, HTMLRenderer, Table } from "@djot/djot";

function renderCell(node: Cell, renderer: HTMLRenderer): string {
  const tag = node.head ? "th" : "td";
  const modifier = node.align === "default" ? "" : ` class="align-${node.align}"`;
  return `<${tag}${modifier}>${renderer.renderChildren(node)}</${tag}>`;
}

// djot puts the caption and every row straight inside <table>; the header rows belong in
// <thead> and the rest in <tbody>
function renderTable(node: Table, renderer: HTMLRenderer): string {
  const rows = node.children.filter((child) => child.tag === "row");
  const group = (tag: string, picked: readonly (typeof rows)[number][]): string =>
    picked.length === 0 ? "" : `<${tag}>\n${picked.map((row) => renderer.renderAstNode(row)).join("")}</${tag}>\n`;

  return [
    `${renderer.renderTag("table", node)}\n`,
    renderer.renderAstNode(node.children[0]),
    group(
      "thead",
      rows.filter((row) => row.head),
    ),
    group(
      "tbody",
      rows.filter((row) => !row.head),
    ),
    "</table>\n",
  ].join("");
}

const ascii = /^[\x20-\x7e]+$/u;

// djot derives an id from the heading text, so a Chinese heading produces a fragment that
// has to be percent-encoded. Those ids are replaced with an ASCII slug and every link that
// points at one follows; ids that are already ASCII are left exactly as written.
function asciiIds(html: string): string {
  const renamed = new Map<string, string>();
  const taken = new Set<string>();
  let index = 0;

  const withIds = html.replace(/ id="([^"]+)"/gu, (match, id: string) => {
    index += 1;
    if (ascii.test(id)) {
      taken.add(id);
      return match;
    }

    const words = id
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "");
    // a slug has to start with a letter, or it cannot be written as a CSS selector
    const base = /^[a-z]/u.test(words) ? words : `section-${String(index)}`;

    let slug = base;
    for (let suffix = 2; taken.has(slug); suffix += 1) {
      slug = `${base}-${String(suffix)}`;
    }
    taken.add(slug);
    renamed.set(id, slug);
    return ` id="${slug}"`;
  });

  if (renamed.size === 0) {
    return withIds;
  }

  return withIds.replace(/ href="#([^"]+)"/gu, (match, target: string) => {
    const slug = renamed.get(target);
    return slug === undefined ? match : ` href="#${slug}"`;
  });
}

export function renderDjot(source: string, file: string): string {
  const warnings: string[] = [];
  const ast = parse(source, { warn: (warning) => warnings.push(warning.render()) });
  const html = renderHTML(ast, {
    warn: (warning) => warnings.push(warning.render()),
    overrides: { cell: renderCell, table: renderTable },
  });

  if (warnings.length > 0) {
    throw new Error(`${file}:\n${warnings.map((warning) => `  ${warning}`).join("\n")}`);
  }

  return asciiIds(html);
}
