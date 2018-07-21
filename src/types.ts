// Helper for using a JS object as a map
export type ObjMap<V, K extends string = string> = { [P in K]: V };

// Can be used to implement exhaustiveness checks in TS.
// Returns "any" for convenience.
export function assertExhausted(value: void): any {
  throw new Error(`Runtime behaviour doesn't match type definitions (value was "${value}")`);
}

// Filters out null/undefined while preserving types
export function isNotNull<T extends any>(x: T): x is NonNullable<T> {
  return x !== null && typeof x !== 'undefined';
}
