import type { Route } from "../ids.ts";

export interface Post {
  readonly slug: string;
  readonly route: Route;
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly html: string;
}

export interface Memo {
  readonly slug: string;
  readonly anchor: string;
  readonly date: string;
  readonly html: string;
}

export interface Tag {
  readonly name: string;
  readonly route: Route;
  readonly posts: readonly Post[];
}

export interface Track {
  readonly file: string;
  readonly title: string;
}

export interface Page {
  readonly slug: string;
  readonly route: Route;
  readonly title: string;
  readonly html: string;
}

export interface SearchEntry {
  readonly kind: "post" | "memo";
  readonly title: string;
  readonly url: string;
  readonly date: string;
  readonly dateLabel: string;
  readonly tags: readonly { readonly name: string; readonly url: string }[];
  readonly text: string;
}
