/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th June 2019 2:03:34 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import * as ju from "mocha-junit-reporter";
import * as path from "path";
import * as testRunner from "vscode/lib/testrunner";

// You can directly control Mocha options by uncommenting the following lines
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info

testRunner.configure({
    reporter: ju,
    reporterOptions: {
        mochaFile: path.join(__dirname,  "..", "..", "results", "test-results.xml"),
        toConsole: true,
    },
    ui: "tdd", 		// the TDD UI is being used in extension.test.ts (suite, test, etc.)
    useColors: true, // colored output from test results
    useInlineDiffs: true,
    // grep: '3', // for test names to execute
});

module.exports = testRunner;
