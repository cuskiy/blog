export interface Friend {
  readonly name: string;
  readonly url: string;
  readonly avatar: string;
  readonly note: string;
}

export const friends: readonly Friend[] = [
  {
    name: "SaltedFishes",
    url: "https://saltedfishes.com",
    avatar: "saltedfishes.webp",
    note: "「Tragedy is coming ‘as I wish’......」",
  },
  {
    name: "Anillc's Blog",
    url: "https://blog.anil.lc",
    avatar: "anillc.webp",
    note: "喜欢弹吉他和写代码",
  },
  {
    name: "樱桃",
    url: "https://sakura.moe",
    avatar: "sakura.webp",
    note: "樱桃妹妹最可爱！",
  },
  {
    name: "William Wei's Blog",
    url: "https://williamwei.top",
    avatar: "williamwei.webp",
    note: "Everything weill be well. Hopefully.",
  },
  {
    name: "Justin Chen's Blog",
    url: "https://blog.starryreverie.cc",
    avatar: "starryreverie.jpg",
    note: "A world where insightful idea sparks.",
  },
  {
    name: "rikkaneko's Blog",
    url: "https://blog.nekoid.cc",
    avatar: "rikkaneko.jpg",
    note: "I hope one day all mankind will stop fighting against each other, and start working together to explore the vast universe.",
  },
  {
    name: "Chen Pan's Blog",
    url: "https://blog.chenpan.me/",
    avatar: "chenpan.avif",
    note: "选择一个难到几乎无人看好的项目，带着那种「我偏要证明给他们看」的冲劲去完成。",
  },
];
