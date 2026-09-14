export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Returns a new object: nested objects merge recursively, arrays and scalars are replaced. */
export function deepMerge(target, patch) {
  const result = isPlainObject(target) ? structuredClone(target) : {};
  for (const [key, value] of Object.entries(patch ?? {})) {
    result[key] = isPlainObject(value) && isPlainObject(result[key])
      ? deepMerge(result[key], value)
      : structuredClone(value);
  }
  return result;
}
