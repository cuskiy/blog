export interface Icon {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
}

// The site's own avatar goes out as a blogroll address, so it keeps its name where every
// other asset carries a hash of its bytes.
export const siteAvatar = "cuskiy.svg";

// Written by the build, read by the search page, and kept out of both service worker caches.
export const searchIndexUrl = "/assets/search.json";

// Everything a page needs to point at. The urls are decided at build time, so no template
// ever builds a path of its own.
export interface Assets {
  readonly css: string;
  readonly scripts: Readonly<Record<"music" | "search" | "oneko" | "about", string>>;
  readonly favicon: string;
  readonly icons: readonly Icon[];
  readonly art: string;
  readonly avatars: Readonly<Record<string, string>>;
}
