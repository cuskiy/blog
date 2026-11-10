// the type parameter is the whole point: the caller says which element type it expects
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`missing element: ${selector}`);
  }
  return found;
}
