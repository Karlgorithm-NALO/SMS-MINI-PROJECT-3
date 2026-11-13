// A minimal Excel workbook writer. A CSV carries no types, so Excel guesses:
// 233241234567 turns into 2.33241E+11, 0209876543 loses its leading zero and
// 50.00 shows as 50. A real .xlsx stores each cell with its type and format,
// so phone numbers stay text and money keeps two decimals. No dependencies:
// an .xlsx file is a zip of a few XML parts, stored here without compression.

export type XlsxCell =
  | { text: string }
  | { number: string; decimals?: 0 | 2 } // a plain decimal string, e.g. "25.50"
  | null;

export type XlsxColumn = {
  header: string;
  text?: boolean; // format the whole column as text, so Excel never reinterprets it
  maxWidth?: number; // in Excel character units; columns otherwise grow to fit
};

const encoder = new TextEncoder();

// Cell styles defined in styles.xml below.
const STYLE = { header: 1, money: 2, text: 3, integer: 4 } as const;

function escapeXml(value: string): string {
  // XML 1.0 forbids most control characters, so drop any a CSV row might carry.
  const allowed = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join("");
  return allowed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/**
 * Excel never auto-fits columns when it opens a file, so fit them here: each
 * column is as wide as its longest value (the bold header counts a little
 * wider), plus padding, up to maxWidth.
 */
export function fitColumnWidths(columns: XlsxColumn[], rows: XlsxCell[][]): number[] {
  return columns.map((column, index) => {
    let longest = column.header.length * 1.1;
    for (const cells of rows) {
      const cell = cells[index];
      if (!cell) continue;
      longest = Math.max(longest, "text" in cell ? cell.text.length : cell.number.length);
    }
    return Math.min(column.maxWidth ?? 80, Math.ceil(longest + 3));
  });
}

function sheetXml(columns: XlsxColumn[], rows: XlsxCell[][]): string {
  const widths = fitColumnWidths(columns, rows);
  const cols = columns
    .map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${widths[index]}" customWidth="1"/>`)
    .join("");
  const header = columns
    .map((column, index) => `<c r="${columnName(index)}1" t="inlineStr" s="${STYLE.header}"><is><t>${escapeXml(column.header)}</t></is></c>`)
    .join("");
  const body = rows
    .map((cells, rowIndex) => {
      const r = rowIndex + 2;
      const xml = cells
        .map((cell, index) => {
          const ref = `${columnName(index)}${r}`;
          if (cell === null) return "";
          if ("text" in cell) {
            const style = columns[index]?.text ? ` s="${STYLE.text}"` : "";
            return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(cell.text)}</t></is></c>`;
          }
          return `<c r="${ref}" s="${cell.decimals === 0 ? STYLE.integer : STYLE.money}"><v>${cell.number}</v></c>`;
        })
        .join("");
      return `<row r="${r}">${xml}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Freeze the header row so it stays visible while scrolling.
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols>` +
    `<sheetData><row r="1">${header}</row>${body}</sheetData>` +
    "</worksheet>"
  );
}

function workbookParts(sheetName: string, columns: XlsxColumn[], rows: XlsxCell[][]): [string, string][] {
  return [
    [
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>",
    ],
    [
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    ],
    [
      "xl/workbook.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>` +
        "</workbook>",
    ],
    [
      "xl/_rels/workbook.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        "</Relationships>",
    ],
    [
      "xl/styles.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="5">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // 0 default
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // 1 bold header
        '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // 2 money, 0.00
        '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // 3 text, @
        '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // 4 whole number, 0
        "</cellXfs>" +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    ],
    ["xl/worksheets/sheet1.xml", sheetXml(columns, rows)],
  ];
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Packs files into a zip archive using the "stored" method (no compression). */
export function zipStored(files: [string, Uint8Array][]): Uint8Array<ArrayBuffer> {
  const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1 January 1980, so identical input gives identical bytes
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const [name, data] of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(14, DOS_DATE, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  }

  const centralSize = central.reduce((size, part) => size + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const output = new Uint8Array(new ArrayBuffer(parts.reduce((size, part) => size + part.length, 0)));
  let position = 0;
  for (const part of parts) {
    output.set(part, position);
    position += part.length;
  }
  return output;
}

/** Builds a one-sheet .xlsx workbook with a bold, frozen header row. */
export function buildXlsx(sheetName: string, columns: XlsxColumn[], rows: XlsxCell[][]): Uint8Array<ArrayBuffer> {
  return zipStored(workbookParts(sheetName, columns, rows).map(([name, xml]) => [name, encoder.encode(xml)]));
}
