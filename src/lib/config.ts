export interface NavItem {
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

export const nav: readonly NavItem[] = [
  { label: "文章", path: "/" },
  { label: "随笔", path: "/memo/" },
  { label: "标签", path: "/tags/" },
  { label: "搜索", path: "/search/" },
  { label: "音乐", path: "/music/" },
  { label: "友链", path: "/links/" },
  { label: "关于", path: "/about/" },
];

export const perPage = {
  posts: 20,
  memos: 10,
} as const;

export function tagPath(name: string): string {
  return `/tags/${encodeURIComponent(name)}/`;
}
