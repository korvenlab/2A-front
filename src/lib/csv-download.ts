/** Export CSV com BOM UTF-8 (Excel no Windows). */

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const lines = [
    headers.map(escapeCsvCell).join(";"),
    ...rows.map((r) => r.map(escapeCsvCell).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.\-]+/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}
