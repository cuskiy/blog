const digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/u;

function digit(value: number): string {
  const character = digits[value];
  if (character === undefined) {
    throw new Error(`no Chinese digit for ${value}`);
  }
  return character;
}

function chineseNumber(value: number): string {
  if (value < 1 || value > 99) {
    throw new Error(`no Chinese count for ${value}`);
  }
  if (value < 10) {
    return digit(value);
  }
  if (value < 20) {
    return `十${value === 10 ? "" : digit(value - 10)}`;
  }
  const ones = value % 10;
  return `${digit(Math.floor(value / 10))}十${ones === 0 ? "" : digit(ones)}`;
}

export function formatDate(iso: string): string {
  const parts = isoDate.exec(iso);
  if (parts === null) {
    throw new Error(`date must be written as YYYY-MM-DD, got ${JSON.stringify(iso)}`);
  }

  const [, year = "", month = "", day = ""] = parts;
  const yearText = Array.from(year)
    .map((character) => digit(Number(character)))
    .join("");
  return `${yearText}年${chineseNumber(Number(month))}月${chineseNumber(Number(day))}日`;
}
