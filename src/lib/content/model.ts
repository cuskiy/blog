export interface Post {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly html: string;
}

export interface Memo {
  readonly id: string;
  readonly date: string;
  readonly html: string;
}

export interface Tag {
  readonly name: string;
  readonly posts: readonly Post[];
}

export interface Track {
  readonly file: string;
  readonly title: string;
}

export interface Page {
  readonly slug: string;
  readonly title: string;
  readonly html: string;
}

export interface SearchEntry {
  readonly kind: "post" | "memo";
  readonly title: string;
  readonly url: string;
  readonly date: string;
  readonly dateLabel: string;
  readonly tags: readonly string[];
  readonly text: string;
}
