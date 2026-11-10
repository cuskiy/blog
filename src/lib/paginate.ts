export function paginate<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`page size must be a positive integer, got ${String(size)}`);
  }
  if (items.length === 0) {
    return [[]];
  }

  const pages: (readonly T[])[] = [];
  for (let start = 0; start < items.length; start += size) {
    pages.push(items.slice(start, start + size));
  }
  return pages;
}
