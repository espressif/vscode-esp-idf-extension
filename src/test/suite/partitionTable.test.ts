import * as assert from "assert";
import { isValidJSON, JSON2CSV } from "../../views/partition-table/util";
import { CSV2JSON } from "../../views/partition-table/util";
// You can import and use all API from the "vscode" module
// as well as import your extension to test it
import * as vscode from "vscode";
import { stringify } from "querystring";
import { PartitionTable } from "../../views/partition-table/store";
import * as fse from "fs-extra";
// import * as myExtension from "../extension";

suite("PartitionTable Suite", () => {

  test("CSV2JSON mockdata test", async () => {
    const urlCSV = __dirname + "/../../../testFiles/test.csv";
    const urlJSON = __dirname + "/../../../testFiles/test.json";
    let dataCSV = await fse.readFile(urlCSV,"utf-8");
    let dataJSON = await fse.readFile(urlJSON, "utf-8");
    await assert.equal(JSON.stringify(CSV2JSON<PartitionTable.Row>(dataCSV)), JSON.stringify(JSON.parse((dataJSON))));
  });

  test("Row validation", async () => {
    let validRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(validRow)), JSON.stringify({ 
      ok: true,
      error: "",
      row: -1
    }));
  });

  // Name field related unit tests
  test("Name field empty validation", async () => {
    let invalidRow = [{
      "name": "",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Name is mandatory",
      row: 0 
    }));
  });

  test("Name field too long validation", async () => {
    let invalidRow = [{
      "name": "12345678901234567",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Names longer than 16 characters are not allowed",
      row: 0
    }));
  });

  // Type field related unit tests
  test("Type field empty validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Type is required",
      row: 0
    }));
  });

  test("Type field input string value > 254 validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "255",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  test("Type field input string value < 0 validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "-1",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  test("Type field input string invalid", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "testing",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  test("Type field input more than 2 hex numbers after 0x prefix", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0x12c",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  test("Type field input is not a hex number", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0x1g",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  test("Type field input 0xFF is not valid", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0xFF",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.",
      row: 0
    }));
  });

  // Subtype field related unit tests
  test("Subtype field empty validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "SubType is required",
      row: 0
    }));
  });

  test("Subtype field for type app random string", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "app",
      "subtype": "testing",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"app\", the subtype field can only be specified as \"factory\" (0x00), \"ota_0\" (0x10) … \"ota_15\" (0x1F) or \"test\" (0x20)",
      row: 0
    }));
  });

  test("Subtype field for type app valid value contained in a longer string", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "app",
      "subtype": "0x20ca",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"app\", the subtype field can only be specified as \"factory\" (0x00), \"ota_0\" (0x10) … \"ota_15\" (0x1F) or \"test\" (0x20)",
      row: 0
    }));
  });

  test("Subtype field for type app 0x21 should be invalid", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "app",
      "subtype": "0x21",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"app\", the subtype field can only be specified as \"factory\" (0x00), \"ota_0\" (0x10) … \"ota_15\" (0x1F) or \"test\" (0x20)",
      row: 0
    }));
  });

  test("Subtype field for type app invalid hex number", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "app",
      "subtype": "0x1g",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"app\", the subtype field can only be specified as \"factory\" (0x00), \"ota_0\" (0x10) … \"ota_15\" (0x1F) or \"test\" (0x20)",
      row: 0
    }));
  });

  test("Subtype field for type data valid string value contained in a longer string", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "otas",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82)",
      row: 0
    }));
  });

  test("Subtype field for type data valid hex value contained in a longer string", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "0x000",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82)",
      row: 0
    }));
  });

  test("Subtype field for type data 0x10 should be invalid", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "0x10",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82)",
      row: 0
    }));
  });

  test("Subtype field for custom type valid hex value contained in a longer string", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0x40",
      "subtype": "0x000",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "If the partition type is any application-defined value (range 0x40-0xFE), then subtype field can be any value chosen by the application (range 0x00-0xFE).",
      row: 0
    }));
  });

  test("Subtype field for custom type random invalid string value", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0x40",
      "subtype": "test",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "If the partition type is any application-defined value (range 0x40-0xFE), then subtype field can be any value chosen by the application (range 0x00-0xFE).",
      row: 0
    }));
  });

  test("Subtype field for custom 0xFF should be invalid", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "0x40",
      "subtype": "0xFF",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "If the partition type is any application-defined value (range 0x40-0xFE), then subtype field can be any value chosen by the application (range 0x00-0xFE).",
      row: 0
    }));
  });

  // Offset field related unit tests
  test("Offset field empty validation", async () => {
    let validRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "",
      "size": "10M",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(validRow)), JSON.stringify({ 
      ok: true,
      error: "",
      row: -1
    }));
  });

  test("Offset field random invalid string input", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "testing0x10",
      "size": "10M",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Offsets can be specified as decimal numbers, hex numbers with the prefix 0x, size multipliers K or M (1024 and 1024*1024 bytes) or left empty.",
      row: 0
    }));
  });

  // Size field related unit tests
  test("Size field empty validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Size is required",
      row: 0
    }));
  });

  test("Size field wrong input validation", async () => {
    let invalidRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "Testing",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(invalidRow)), JSON.stringify({ 
      ok: false,
      error: "Size can be specified as decimal numbers, hex numbers with the prefix 0x, or size multipliers K or M (1024 and 1024*1024 bytes).",
      row: 0
    }));
  });

  test("Size field decimal number ending with M or K validation", async () => {
    let validRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24M",
      "flag": false,
      "error": undefined
    },{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "24K",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(validRow)), JSON.stringify({ 
      ok: true,
      error: "",
      row: -1
    }));
  });

  test("Size field hex number with 0x validation", async () => {
    let validRow = [{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "0xfac",
      "flag": false,
      "error": undefined
    },{
      "name": "ncs",
      "type": "data",
      "subtype": "nvs",
      "offset": "0x9000",
      "size": "252",
      "flag": false,
      "error": undefined
    }];
    await assert.equal(JSON.stringify(isValidJSON(validRow)), JSON.stringify({ 
      ok: true,
      error: "",
      row: -1
    }));
  });
});