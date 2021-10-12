import * as assert from "assert";
import {
  JSON2CSV,
  csv2Json, 
  validateRows,
  isInValidRow,
  numberTypes,
  minValues,
  maxValues
} from "../../views/nvs-partition-table/util";
// You can import and use all API from the "vscode" module
// as well as import your extension to test it
import * as vscode from "vscode";
import { stringify } from "querystring";
import { NvsPartitionTable } from "../../views/nvs-partition-table/store/index";
import * as fse from "fs-extra";
import { resolve } from "path";

suite("NVS PartitionTable Suite", () => {

  test("CSV2JSON mockdata test", async () => {
    const urlCSV = resolve(__dirname,"..", "..", "..", "testFiles", "nvs-test.csv");
    const urlJSON = resolve(__dirname,"..", "..", "..", "testFiles", "nvs-test.json");
    let dataCSV = await fse.readFile(urlCSV,"utf-8");
    let dataJSON = await fse.readFile(urlJSON, "utf-8");
    await assert.equal(csv2Json(dataCSV), JSON.parse(dataJSON));
  });

  test("JSON2CSV mockdata test", async () => {
    const urlCSV = resolve(__dirname,"..", "..", "..", "testFiles", "nvs-test.csv");
    const urlJSON = resolve(__dirname,"..", "..", "..", "testFiles", "nvs-test.json");
    let dataCSV = await fse.readFile(urlCSV,"utf-8");
    let dataJSON = await fse.readFile(urlJSON, "utf-8");
    await assert.equal(JSON2CSV(JSON.parse(dataJSON)), dataCSV);
  });

  test("Row validation", async() => {
    const urlJSON = __dirname + "/../../../testFiles/nvs-test.json";
    let dataJSON = await fse.readFile(urlJSON, "utf-8");
    let validAnswer = [{
      ok: true,
      errorMsg: '',
      rowIndex: -1
    },
    {
      ok: true,
      errorMsg: '',
      rowIndex: -1
    },
    {
      ok: true,
      errorMsg: '',
      rowIndex: -1
    }];

    await assert.equal(JSON.stringify(validateRows(JSON.parse(dataJSON))), JSON.stringify(validAnswer));
  });

  test("Key field empty validation", async() => {
    let invalidRow = {
    key: "",
    type: "namespace",
    encoding: "",
    value: "",
    error: ""
    };
    await assert.equal(isInValidRow(invalidRow), "Key field is required");
  });

  test("Key field max character length validation", async() => {
    let invalidRow = {
      key: "0123456789abcdef",
      type: "namespace",
      encoding: "",
      value: "",
      error: ""
      };
    await assert.equal(isInValidRow(invalidRow), "Maximum key length is 15 characters");
  });

  test("Type field empty validation", async() => {
    let invalidRow = {
      key: "0123456789abcde",
      type: "",
      encoding: "",
      value: "",
      error: ""
      };
    await assert.equal(isInValidRow(invalidRow), "Type field is required");
  });

  test("Type field value namespace validation", async() => {
    let validRow = {
      key: "0123456789abcde",
      type: "namespace",
      encoding: "",
      value: "",
      error: ""
      };
    await assert.equal(isInValidRow(validRow), undefined);
  });

  test("Type field value file validation", async() => {
    let validRow = {
      key: "0123456789abcde",
      type: "file",
      encoding: "string",
      value: "/path/to/file",
      error: ""
      };
    await assert.equal(isInValidRow(validRow), undefined);
  });
 
  test("Encoding field empty validation", async() => {
    let invalidRow = {
      key: "0123456789abcde",
      type: "test",
      encoding: "",
      value: "",
      error: ""
    };
    await assert.equal(isInValidRow(invalidRow), "Encoding is required");
  });

  test("Value field empty validation", async() => {
    let invalidRow = {
      key: "0123456789abcde",
      type: "test",
      encoding: "u8",
      value: "",
      error: ""
    };
    await assert.equal(isInValidRow(invalidRow), "Value is required");
  });

  test("Value field over 4000 bytes for string encoding", async() => {
    let stringOver4000 = '1'.repeat(4001);
    let invalidRow = {
      key: "0123456789abcde",
      type: "test",
      encoding: "string",
      value: stringOver4000,
      error: ""
    };
    await assert.equal(isInValidRow(invalidRow), "String value is limited to 4000 bytes");
  });

  test("Value field under 4000 bytes for string encoding", async() => {
    let invalidRow = {
      key: "0123456789abcde",
      type: "test",
      encoding: "string",
      value: "testing",
      error: ""
    };
    await assert.equal(isInValidRow(invalidRow), undefined);
  });

  test("Value field invalid number for numberTypes encoding", async() => {
    let invalidRow = {
      key: "0123456789abcde",
      type: "test",
      encoding: "u8",
      value: "123s",
      error: ""
    };
    await assert.equal(isInValidRow(invalidRow), "Value is not a valid number");
  });

  let no64Types = numberTypes.filter(element => element !== 'u64' && element !== 'i64')

  no64Types.forEach( i => {
    test(`Value field invalid numbers for ${i}`, async() => {
      let invalidRow1 = {
        key: "0123456789abcde",
        type: "test",
        encoding: `${i}`,
        value: `${minValues[i] - 1}`,
        error: ""
      };
      let invalidRow2 = {
        key: "0123456789abcde",
        type: "test",
        encoding: `${i}`,
        value: `${maxValues[i] + 1}`,
        error: ""
      };
      
      await assert.equal(isInValidRow(invalidRow1), `Out of range for ${i}`);
      await assert.equal(isInValidRow(invalidRow2), `Out of range for ${i}`);
    });
  });

  no64Types.forEach( i => {
      test(`Value field testing min and max number for ${i} encoding`, async() => {
        let validRow1 = {
          key: "0123456789abcde",
          type: "test",
          encoding: `${i}`,
          value: `${minValues[i]}`,
          error: ""
        };
        let validRow2 = {
          key: "0123456789abcde",
          type: "test",
          encoding: `${i}`,
          value: `${maxValues[i]}`,
          error: ""
        };
        
        await assert.equal(isInValidRow(validRow1), undefined);
        await assert.equal(isInValidRow(validRow2), undefined);
      });
  });
});