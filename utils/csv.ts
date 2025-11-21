export function arrayToCsv(rows: Array<Record<string, any>>, headers?: string[]): string {
  if (!rows || rows.length === 0) return '';
  const cols = headers && headers.length ? headers : Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map(c => esc(row[c])).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: Array<Record<string, any>>, headers?: string[]) {
  const csv = arrayToCsv(rows, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): Array<Record<string, string>> {
  // Simple CSV parser assuming first line headers, comma delimiter, quotes supported
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line: string) => {
    const result: string[] = [];
    let cur = '';
    let i = 0;
    let inQuotes = false;
    while (i < line.length) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        } else { cur += ch; i++; continue; }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === ',') { result.push(cur); cur = ''; i++; continue; }
        cur += ch; i++; continue;
      }
    }
    result.push(cur);
    return result;
  };
  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let idx = 1; idx < lines.length; idx++) {
    const values = parseLine(lines[idx]);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    rows.push(obj);
  }
  return rows;
}
