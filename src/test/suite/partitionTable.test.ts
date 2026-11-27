import * as assert from "assert";
import { isValidJSON, JSON2CSV } from "../../views/partition-table/util";
import { CSV2JSON } from "../../views/partition-table/util";
import {
  applySize,
  fitSize,
  reclaimSize,
  recommendSize,
  resolveLayout,
} from "../../views/partition-table/layout";
import { createPresetRows } from "../../views/partition-table/presets";
import {
  parseFlashSizeBytes,
  parsePartitionTableOffset,
} from "../../espIdf/partition-table/flashMetadata";
import * as vscode from "vscode";
import { stringify } from "querystring";
import { PartitionTable } from "../../views/partition-table/store";
import { resolve } from "path";
import * as fse from "fs-extra";

suite("PartitionTable Suite", () => {

  test("CSV2JSON mockdata test", async () => {
    const urlCSV = resolve(__dirname,"..", "..", "..", "testFiles", "test.csv");
    const urlJSON = resolve(__dirname,"..", "..", "..", "testFiles", "test.json");
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

  test("Type field input string value bigger than 254 validation", async () => {
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

  test("Type field input string value smaller than 0 validation", async () => {
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
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), \"efuse\" (0x05), \"fat\" (0x81), \"spiffs\" (0x82), \"littlefs\" (0x83) or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82, 0x83)",
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
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), \"efuse\" (0x05), \"fat\" (0x81), \"spiffs\" (0x82), \"littlefs\" (0x83) or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82, 0x83)",
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
      error: "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), \"efuse\" (0x05), \"fat\" (0x81), \"spiffs\" (0x82), \"littlefs\" (0x83) or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82, 0x83)",
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

  test("littlefs, efuse, and 0x83 subtypes are valid", () => {
    for (const subtype of ["littlefs", "efuse", "0x83"]) {
      const result = isValidJSON([
        {
          name: "storage",
          type: "data",
          subtype,
          offset: "0x9000",
          size: "64K",
          flag: false,
          readOnly: false,
          error: "",
        },
      ]);
      assert.strictEqual(result.ok, true, subtype);
    }
  });

  test("encrypted and readonly flags round trip", () => {
    const csv = JSON2CSV([
      {
        name: "nvs",
        type: "data",
        subtype: "nvs",
        offset: "0x9000",
        size: "24K",
        flag: true,
        readOnly: true,
        error: "",
      },
    ]);
    const rows = CSV2JSON<PartitionTable.Row>(String(csv));
    assert.strictEqual(rows[0].flag, true);
    assert.strictEqual(rows[0].readOnly, true);
    assert.ok(String(csv).includes("encrypted:readonly"));
  });

  test("sdkconfig flash size and partition table offset parse", () => {
    assert.strictEqual(parseFlashSizeBytes('"4MB"'), 4 * 1024 * 1024);
    assert.strictEqual(parseFlashSizeBytes("16MB"), 16 * 1024 * 1024);
    assert.strictEqual(parseFlashSizeBytes(""), 0);
    assert.strictEqual(parsePartitionTableOffset("0x8000"), 0x8000);
    assert.strictEqual(parsePartitionTableOffset(""), 0x8000);
    assert.strictEqual(parsePartitionTableOffset("not-a-number"), 0x8000);
  });

  test("blank offsets follow ESP-IDF alignment and explicit offsets stay fixed", () => {
    const flashSize = 4 * 1024 * 1024;
    const layout = resolveLayout(
      [
        { name: "nvs", type: "data", subtype: "nvs", offset: "", size: "24K" },
        { name: "factory", type: "app", subtype: "factory", offset: "", size: "1M" },
      ],
      flashSize,
      0x8000,
      true
    );
    assert.strictEqual(layout.partitions[0].offset, 0x9000);
    assert.strictEqual(layout.partitions[0].fixedOffset, false);
    assert.strictEqual(layout.partitions[1].offset, 0x10000);
    assert.strictEqual(layout.segments[0].kind, "reserved");
    assert.ok(layout.segments.some((segment) => segment.kind === "free"));
    assert.ok(
      layout.warnings.some((warning) => warning.message.includes("still free"))
    );

    const fixed = resolveLayout(
      [
        {
          name: "nvs",
          type: "data",
          subtype: "nvs",
          offset: "0x11000",
          size: "4K",
        },
      ],
      flashSize,
      0x8000,
      true
    );
    assert.strictEqual(fixed.partitions[0].offset, 0x11000);
    assert.strictEqual(fixed.partitions[0].fixedOffset, true);
    assert.ok(fixed.segments.some((segment) => segment.name === "Free Space"));
  });

  test("size changes cannot cross a fixed offset or the flash end", () => {
    const rows = [
      { name: "nvs", type: "data", subtype: "nvs", offset: "", size: "24K" },
      {
        name: "factory",
        type: "app",
        subtype: "factory",
        offset: "0x20000",
        size: "1M",
      },
    ];
    const flashSize = 4 * 1024 * 1024;
    const reclaimed = reclaimSize(rows, 0, flashSize, 0x8000, true);
    assert.strictEqual(reclaimed[0].size, "92K");

    const fitted = fitSize(rows, 1, flashSize, 0x8000, true);
    const fittedRows = rows.map((row, index) => ({
      ...row,
      size: fitted.find((update) => update.index === index)?.size ?? row.size,
    }));
    const layout = resolveLayout(fittedRows, flashSize, 0x8000, true);
    assert.ok(layout.partitions[1].end <= flashSize);
    assert.ok(!layout.warnings.some((warning) => warning.message.includes("overlaps")));
  });

  test("equal OTA slots resize together and unequal mode does not", () => {
    const rows = [
      { name: "ota_0", type: "app", subtype: "ota_0", offset: "", size: "1M" },
      { name: "ota_1", type: "app", subtype: "ota_1", offset: "", size: "64K" },
    ];
    const flashSize = 4 * 1024 * 1024;
    const unequal = resolveLayout(rows, flashSize, 0x8000, true);
    assert.ok(
      unequal.warnings.some((warning) =>
        warning.message.includes("different sizes")
      )
    );

    const together = applySize(rows, 0, 3 * 1024 * 1024, flashSize, 0x8000, true);
    assert.strictEqual(together.length, 2);
    assert.strictEqual(together[0].size, together[1].size);
    const resized = rows.map((row, index) => ({
      ...row,
      size: together.find((update) => update.index === index)?.size ?? row.size,
    }));
    const layout = resolveLayout(resized, flashSize, 0x8000, true);
    assert.ok(layout.partitions.every((part) => part.end <= flashSize));

    const alone = applySize(rows, 0, 2 * 1024 * 1024, flashSize, 0x8000, false);
    assert.strictEqual(alone.length, 1);
    assert.strictEqual(alone[0].index, 0);
  });

  test("OTA layout warns when otadata or nvs is missing and when flash overflows", () => {
    const missing = resolveLayout(
      [
        { name: "app0", type: "app", subtype: "ota_0", offset: "", size: "1M" },
        { name: "app1", type: "app", subtype: "ota_1", offset: "", size: "1M" },
      ],
      4 * 1024 * 1024,
      0x8000,
      true
    );
    assert.ok(missing.warnings.some((warning) => warning.message.includes("otadata")));
    assert.ok(missing.warnings.some((warning) => warning.message.includes("nvs")));

    const preset = createPresetRows("factory");
    assert.ok(preset);
    const overflow = resolveLayout(preset, 2 * 1024 * 1024, 0x8000, true);
    assert.ok(
      overflow.warnings.some((warning) => warning.message.includes("extends past flash"))
    );
  });

  test("recommended size and zigbee preset", () => {
    const rows = [
      { name: "nvs", type: "data", subtype: "nvs", offset: "", size: "4K" },
    ];
    const recommended = recommendSize(rows, 0, 4 * 1024 * 1024, 0x8000, true);
    assert.strictEqual(recommended[0].size, "12K");

    const zigbee = createPresetRows("zigbee");
    assert.ok(zigbee);
    assert.strictEqual(zigbee.find((row) => row.name === "zb_storage")?.subtype, "nvs");
    assert.strictEqual(zigbee.find((row) => row.name === "zb_fct")?.subtype, "fat");
    assert.strictEqual(zigbee.find((row) => row.name === "zb_fct")?.size, "1K");
  });
});