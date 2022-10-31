/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 24th June 2021 4:20:56 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "assert";
import { readJSON } from "fs-extra";
import { join } from "path";
import { defaultBoards, getBoards } from "../espIdf/openOcd/boardConfiguration";

suite("OpenOCD Board tests", () => {
  let boardJsonObj: any;
  let openOcdScriptsPath = join(__dirname, "../../testFiles");

  setup(async () => {
    try {
      const openOcdEspConfigJsonPath = join(
        openOcdScriptsPath,
        "esp-config.json"
      );
      boardJsonObj = await readJSON(openOcdEspConfigJsonPath);
    } catch (error) {
      console.log(error);
      boardJsonObj = {};
    }
  });

  test("OpenOCD esp config structure", () => {
    assert.notEqual(boardJsonObj.version, undefined, "Check if version exists");
    assert.notEqual(boardJsonObj.targets, undefined, "Check if targets exists");
    assert.notEqual(boardJsonObj.boards, undefined, "Check if boards exists");
    assert.notEqual(boardJsonObj.options, undefined, "Check if options exists");
  });

  test("OpenOCD Boards method", async () => {
    const boards = await getBoards(openOcdScriptsPath);
    assert.equal(boards[0].name, boardJsonObj.boards[0].name);
    assert.equal(boards[0].description, boardJsonObj.boards[0].description);
    assert.equal(boards[0].target, boardJsonObj.boards[0].target);
    assert.deepEqual(
      boards[0].configFiles,
      boardJsonObj.boards[0].config_files
    );
  });

  test("Check default boards", async () => {
    const boards = await getBoards();
    assert.equal(boards[0].name, defaultBoards[0].name);
    assert.equal(boards[0].description, defaultBoards[0].description);
    assert.equal(boards[0].target, defaultBoards[0].target);
    assert.deepEqual(boards[0].configFiles, defaultBoards[0].configFiles);
  });
});
