export function defined<T>(x: T | undefined): T {
  if (x === undefined) throw new Error("expected defined value");
  return x;
}
