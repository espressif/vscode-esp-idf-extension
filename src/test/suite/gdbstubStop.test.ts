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
  chooseStubStopAction,
  isProjectSource,
  projectDirectoryFromProgram,
} from "../../debugAdapter/adapter/gdbstubStop";

const project = "D:/esp-idf projects/blink";
const main = `${project}/main/main.c`;

suite("gdbstub stop", () => {
  test("treats the workspace main file as project source", () => {
    assert.strictEqual(
      projectDirectoryFromProgram(`${project}/build/blink.elf`),
      project
    );
    assert.strictEqual(isProjectSource(main, project), true);
  });

  test("stays when the current frame is already project source", () => {
    const action = chooseStubStopAction({
      currentThreadId: 2,
      threads: [
        {
          id: 2,
          frames: [
            { func: "app_main", fullname: main, line: "20", level: "0" },
          ],
        },
      ],
      projectDirectory: project,
      hasUserBreakpoint: false,
      entrySymbol: "app_main",
    });
    assert.deepStrictEqual(action, { kind: "stay", threadId: 2 });
  });
});
