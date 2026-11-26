/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "assert";
import {
  quoteGdbinitScript,
  withPathSeparators,
} from "../../debugAdapter/gdbinitQuote";

const symbolsWithSpaces = [
  "# Load esp32s3 ROM ELF symbols",
  "define target hookpost-remote",
  "set confirm off",
  '  # if $_streq((char *) 0x3ff194ad, "Mar  1 2021")',
  "  if (*(int*) 0x3ff194ad) == 0x2072614d",
  "    add-symbol-file C:/Espressif/tools/esp-rom-elfs/esp32s3_rev0_rom.elf",
  "  else",
  "    echo Warning: Unknown esp32s3 ROM revision.\\n",
  "  end",
  "set confirm on",
  "end",
  "",
  "# Load bootloader symbols",
  "set confirm off",
  "    add-symbol-file D:/esp-idf projects/blink/build/bootloader/bootloader.elf",
  "set confirm on",
  "",
  "# Load application symbols",
  "file D:/esp-idf projects/blink/build/blink.elf",
  "",
].join("\n");

suite("gdbinitQuote", () => {
  test("quotes symbol and file paths that contain spaces", () => {
    const quoted = quoteGdbinitScript(symbolsWithSpaces);
    assert.ok(
      quoted.includes(
        '    add-symbol-file "D:/esp-idf projects/blink/build/bootloader/bootloader.elf"'
      )
    );
    assert.ok(
      quoted.includes('file "D:/esp-idf projects/blink/build/blink.elf"')
    );
    assert.ok(
      quoted.includes(
        "    add-symbol-file C:/Espressif/tools/esp-rom-elfs/esp32s3_rev0_rom.elf"
      )
    );
    assert.ok(quoted.includes("define target hookpost-remote"));
    assert.strictEqual(quoteGdbinitScript(quoted), quoted);
  });

  test("keeps an address after a quoted add-symbol-file path", () => {
    assert.strictEqual(
      quoteGdbinitScript(
        "add-symbol-file D:/esp-idf projects/blink/app.elf 0x40000000"
      ),
      'add-symbol-file "D:/esp-idf projects/blink/app.elf" 0x40000000'
    );
    assert.strictEqual(
      quoteGdbinitScript(
        "add-symbol-file D:/esp-idf projects/blink/app.elf -o 0x1000 -readnow"
      ),
      'add-symbol-file "D:/esp-idf projects/blink/app.elf" -o 0x1000 -readnow'
    );
  });

  test("quotes the filesystem side of substitute-path", () => {
    assert.strictEqual(
      quoteGdbinitScript(
        "set substitute-path /COMPONENT_FOO_DIR D:/esp-idf projects/blink/components/foo"
      ),
      'set substitute-path /COMPONENT_FOO_DIR "D:/esp-idf projects/blink/components/foo"'
    );
    assert.strictEqual(
      quoteGdbinitScript("set substitute-path /IDF D:/espressif/esp-idf"),
      "set substitute-path /IDF D:/espressif/esp-idf"
    );
  });

  test("leaves source commands and python blocks unchanged", () => {
    const script = [
      "source D:/esp-idf projects/blink/build/gdbinit/symbols",
      "python",
      "file D:/esp-idf projects/blink/build/blink.elf",
      "end",
      "# add-symbol-file D:/esp-idf projects/blink/build/blink.elf",
    ].join("\n");
    assert.strictEqual(quoteGdbinitScript(script), script);
  });

  test("escapes backslashes and quotes inside a path", () => {
    assert.strictEqual(
      quoteGdbinitScript('file D:\\esp-idf projects\\blink\\"blink.elf'),
      'file "D:\\\\esp-idf projects\\\\blink\\\\\\"blink.elf"'
    );
  });

  test("preserves CRLF line endings", () => {
    const script =
      "file D:/esp-idf projects/blink/build/blink.elf\r\nset confirm on\r\n";
    const quoted = quoteGdbinitScript(script);
    assert.ok(quoted.includes("\r\n"));
    assert.ok(!quoted.includes("\n\n"));
    assert.ok(
      quoted.startsWith('file "D:/esp-idf projects/blink/build/blink.elf"\r\n')
    );
  });

  test("inserts the missing directory slash before a ROM elf that exists", () => {
    const romElf =
      "C:/Espressif/tools/esp-rom-elfs/20260528/esp32s3_rev0_rom.elf";
    const broken =
      "    add-symbol-file C:/Espressif/tools/esp-rom-elfs/20260528esp32s3_rev0_rom.elf";
    const fixed = `    add-symbol-file ${romElf}`;
    const romElfExists = (filePath: string) => filePath === romElf;
    assert.strictEqual(
      quoteGdbinitScript(broken, { romElfExists }),
      fixed
    );
    assert.strictEqual(quoteGdbinitScript(broken), broken);
    assert.strictEqual(
      quoteGdbinitScript(broken, { romElfExists: () => false }),
      broken
    );
    assert.strictEqual(quoteGdbinitScript(fixed, { romElfExists }), fixed);
  });

  test("rewrites a quoted gdbinit path with the original separators", () => {
    assert.strictEqual(
      withPathSeparators(
        "D:\\esp-idf projects\\blink\\build\\gdbinit\\quoted\\symbols",
        "D:/esp-idf projects/blink/build/gdbinit/symbols"
      ),
      "D:/esp-idf projects/blink/build/gdbinit/quoted/symbols"
    );
  });
});
