// Parser/serializer for Riot's game.cfg (Windows INI dialect, `key=value`).
//
// The file is written back with the line endings it was read with (Riot ships
// it with CRLF) and with section/key order preserved, so a save only changes
// the values that were actually edited.

export function parseIni(text) {
  const data = {};
  let section = '';
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).trim();
      data[section] ??= {};
      continue;
    }

    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    data[section] ??= {};
    data[section][line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return data;
}

export function stringifyIni(data, eol = '\r\n') {
  const blocks = [];
  for (const [section, values] of Object.entries(data ?? {})) {
    const lines = section === '' ? [] : [`[${section}]`];
    for (const [key, value] of Object.entries(values ?? {})) {
      lines.push(`${key}=${value ?? ''}`);
    }
    blocks.push(lines.join(eol));
  }
  return blocks.join(eol + eol) + eol;
}

/** Returns a new object with `patch` ({ Section: { Key: value } }) applied. */
export function mergeIni(current, patch) {
  const result = structuredClone(current ?? {});
  for (const [section, values] of Object.entries(patch ?? {})) {
    result[section] ??= {};
    for (const [key, value] of Object.entries(values ?? {})) {
      result[section][key] = String(value);
    }
  }
  return result;
}
