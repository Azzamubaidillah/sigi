import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { readXlsxWorksheet, XlsxParseError } from "./xlsx.js";

function fixtureWorkbook(): Uint8Array {
  return zipSync({
    "xl/workbook.xml": strToU8(`<?xml version="1.0"?>
      <x:workbook xmlns:x="urn:workbook" xmlns:r="urn:relations">
        <x:sheets><x:sheet name="Trade Log" sheetId="1" r:id="rId1" /></x:sheets>
      </x:workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0"?>
      <Relationships xmlns="urn:relationships">
        <Relationship Id="rId1" Type="worksheet" Target="/xl/worksheets/sheet1.xml" />
      </Relationships>`),
    "xl/sharedStrings.xml": strToU8(`<?xml version="1.0"?>
      <x:sst xmlns:x="urn:spreadsheet"><x:si><x:t>Symbol &amp; side</x:t></x:si><x:si><x:t></x:t></x:si></x:sst>`),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0"?>
      <x:worksheet xmlns:x="urn:spreadsheet"><x:sheetData>
        <x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="C1" t="inlineStr"><x:is><x:t>USDT</x:t></x:is></x:c></x:row>
        <x:row r="2"><x:c r="A2"><x:f>SUM(1,2)</x:f><x:v>3</x:v></x:c><x:c r="B2" t="b"><x:v>1</x:v></x:c><x:c r="C2" t="s"><x:v>1</x:v></x:c></x:row>
      </x:sheetData></x:worksheet>`),
  });
}

describe("readXlsxWorksheet", () => {
  it("reads namespaced shared strings, inline strings, values, and cached formulas", () => {
    expect(readXlsxWorksheet(fixtureWorkbook(), "Trade Log")).toEqual({
      name: "Trade Log",
      rows: [
        {
          rowNumber: 1,
          cells: [
            { address: "A1", column: 1, value: "Symbol & side", formula: null },
            { address: "C1", column: 3, value: "USDT", formula: null },
          ],
        },
        {
          rowNumber: 2,
          cells: [
            { address: "A2", column: 1, value: "3", formula: "SUM(1,2)" },
            { address: "B2", column: 2, value: "true", formula: null },
            { address: "C2", column: 3, value: "", formula: null },
          ],
        },
      ],
    });
  });

  it("reports a requested sheet that does not exist", () => {
    expect(() => readXlsxWorksheet(fixtureWorkbook(), "Missing")).toThrow(
      new XlsxParseError(
        "SHEET_NOT_FOUND",
        "The workbook has no sheet named Missing.",
      ),
    );
  });

  it("rejects a non-XLSX input before import staging", () => {
    expect(() => readXlsxWorksheet(strToU8("not a zip"), "Trade Log")).toThrow(
      new XlsxParseError(
        "INVALID_ARCHIVE",
        "The file is not a readable XLSX archive.",
      ),
    );
  });
});
