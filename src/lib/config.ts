interface NavItem {
  readonly label: string;
  readonly path: string;
}

export const site = {
  url: "https://blog.ity.moe",
  title: "苏斯基的博客",
  motto: "星空辽阔，何处是乡",
  lang: "zh-CN",
  footer: "© 2026 Cuskiy",
} as const;

// Every address the build writes to. The fixed pages are readable; the content routes are
// prefixes and each entry appends its own id.
export const routes = {
  home: "/",
  posts: "/posts/",
  memos: "/memo/",
  tags: "/tags/",
  pages: "/p/",
  music: "/music/",
  links: "/links/",
  search: "/search/",
  about: "/about/",
} as const;

// The paper the stylesheet derives every tone from. The theme meta and the manifest cannot
// read CSS, so they take the same two literals from here.
export const paper = {
  light: "#ffffff",
  dark: "#141414",
} as const;

export const nav: readonly NavItem[] = [
  { label: "文章", path: routes.home },
  { label: "随笔", path: routes.memos },
  { label: "标签", path: routes.tags },
  { label: "搜索", path: routes.search },
  { label: "音乐", path: routes.music },
  { label: "友链", path: routes.links },
  { label: "关于", path: routes.about },
];

export const perPage = {
  posts: 20,
  memos: 10,
} as const;
