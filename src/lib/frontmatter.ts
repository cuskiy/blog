export interface Frontmatter {
  readonly fields: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface PageMeta {
  readonly title: string;
}

export interface PostMeta {
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly draft: boolean;
}

const postKeys = ["title", "date", "tags", "summary", "draft"] as const;
const pageKeys = ["title"] as const;
const memoKeys = ["date"] as const;

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}

function unquote(value: string): string {
  const quoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
  return quoted ? value.slice(1, -1) : value;
}

export function splitFrontmatter(source: string, file: string): Frontmatter {
  const lines = source.split("\n");
  if (lines[0]?.trim() !== "---") {
    fail(file, "the file must start with --- to open its frontmatter");
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) {
    fail(file, "the frontmatter is never closed with ---");
  }

  const fields: Record<string, string> = {};
  for (const [offset, line] of lines.slice(1, end).entries()) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      fail(file, `line ${offset + 2} is not a key: value pair: ${JSON.stringify(trimmed)}`);
    }
    const key = trimmed.slice(0, colon).trim();
    if (Object.hasOwn(fields, key)) {
      fail(file, `line ${offset + 2} repeats the field ${key}`);
    }
    fields[key] = unquote(trimmed.slice(colon + 1).trim());
  }

  return { fields, body: lines.slice(end + 1).join("\n") };
}

function checkKeys(fields: Readonly<Record<string, string>>, allowed: readonly string[], file: string): void {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      fail(file, `unknown frontmatter field ${key}, expected one of: ${allowed.join(", ")}`);
    }
  }
}

function pick(fields: Readonly<Record<string, string>>, key: string, file: string): string {
  const value = fields[key];
  if (value === undefined || value === "") {
    fail(file, `frontmatter is missing ${key}`);
  }
  return value;
}

function pickDate(fields: Readonly<Record<string, string>>, file: string): string {
  const value = pick(fields, "date", file);
  const parsed = new Date(`${value}T00:00:00Z`);
  const roundTrip = Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  if (roundTrip !== value) {
    fail(file, `date must be a real date written as YYYY-MM-DD, got ${JSON.stringify(value)}`);
  }
  return value;
}

function pickTags(fields: Readonly<Record<string, string>>, file: string): readonly string[] {
  const tags = pick(fields, "tags", file)
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

  if (tags.length === 0) {
    fail(file, "tags needs at least one tag");
  }
  if (new Set(tags).size !== tags.length) {
    fail(file, `tags contains a duplicate: ${tags.join(", ")}`);
  }
  for (const tag of tags) {
    if (tag.includes("/") || tag.includes("\\") || tag.startsWith(".")) {
      fail(file, `a tag may not contain a slash or start with a dot: ${JSON.stringify(tag)}`);
    }
  }
  return tags;
}

export function readPostMeta(fields: Readonly<Record<string, string>>, file: string): PostMeta {
  checkKeys(fields, postKeys, file);

  const draft = fields.draft ?? "false";
  if (draft !== "true" && draft !== "false") {
    fail(file, `draft must be true or false, got ${JSON.stringify(draft)}`);
  }

  return {
    title: pick(fields, "title", file),
    date: pickDate(fields, file),
    tags: pickTags(fields, file),
    summary: pick(fields, "summary", file),
    draft: draft === "true",
  };
}

export function readMemoDate(fields: Readonly<Record<string, string>>, file: string): string {
  checkKeys(fields, memoKeys, file);
  return pickDate(fields, file);
}

export function readPageMeta(fields: Readonly<Record<string, string>>, file: string): PageMeta {
  checkKeys(fields, pageKeys, file);
  return { title: pick(fields, "title", file) };
}
