// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable prefer-arrow-callback */
/* global it,before */
const assert = require('assert');
const requirejs = require('requirejs');

requirejs.config({
  baseUrl: __dirname,
  paths: {
    HtmlFormatter: '../HtmlFormatter',
  },
});

let htmlFormat;
before(function bfr(done) {
  requirejs(['HtmlFormatter'], function loadFrmt(HtmlFormatter) {
    htmlFormat = new HtmlFormatter();
    done();
  });
});


it('Find multiple redText', function test() {
  const input = 'Enable this to put ``queue_trans``, ``get_trans_result`` and ``transmit``';
  const expected =
        'Enable this to put <span>queue_trans</span>, <span>get_trans_result</span> and <span>transmit</span>';
  const result = htmlFormat.formatRedText(input);
  assert.equal(result, expected);
});

it('No redText without errors', function test() {
  const input = 'Enable this to put queue_trans, get_trans_result and transmit';
  const expected =
        'Enable this to put queue_trans, get_trans_result and transmit';
  const result = htmlFormat.formatRedText(input);
  assert.equal(result, expected);
});

it('Find links', function test() {
  const input = 'formatted-io:\nhttps://sourceware.org/newlib/README';
  const expected =
    'formatted-io:\n<a href="https://sourceware.org/newlib/README">https://sourceware.org/newlib/README</a>';
  const result = htmlFormat.formatLinkText(input);
  assert.equal(result, expected);
});

it('No links without errors', function test() {
  const input = 'search for --enable-newlib-nano-formatted-io';
  const expected =
    'search for --enable-newlib-nano-formatted-io';
  const result = htmlFormat.formatLinkText(input);
  assert.equal(result, expected);
});

it('Find middle text bullet point', function test() {
  const input =
    'ESP32 currently supports the following XTAL frequencies:\n\n- 26 MHz\n- 40 MHz\n\nStartup';
  const expected =
    'ESP32 currently supports the following XTAL frequencies:<ul><li> 26 MHz</li><li> 40 MHz\n\n</li></ul>Startup';
  const result = htmlFormat.formatBulletPoint(input);
  assert.equal(result, expected);
});

it('No middle text bullet point without errors', function test() {
  const input =
    'ESP32 currently supports the following XTAL frequencies:';
  const expected =
    'ESP32 currently supports the following XTAL frequencies:';
  const result = htmlFormat.formatBulletPoint(input);
  assert.equal(result, expected);
});

it('Find end text bullet point', function test() {
  const input =
    'clock frequencies will be assumed:\n\n- 150000 Hz.\n- 32768 Hz.\nIt will be switched to internal RC.\n';
  const expected =
    'clock frequencies will be assumed:<ul><li> 150000 Hz.</li><li> 32768 Hz.\nIt will be switched to internal RC.\n</li></ul>';
  const result = htmlFormat.formatEndBulletPoint(input);
  assert.equal(result, expected);
});

it('No end text bullet point without errors', function test() {
  const input =
    'clock frequencies will be assumed: It will be switched to internal RC.\n';
  const expected =
    'clock frequencies will be assumed: It will be switched to internal RC.\n';
  const result = htmlFormat.formatEndBulletPoint(input);
  assert.equal(result, expected);
});

it('Find new line', function test() {
  const input =
    'This value may be reduced.\n\nIf you are seeing "flash read err, 1000" message printed to the\nconsole';
  const expected =
    'This value may be reduced.<br><br>If you are seeing "flash read err, 1000" message printed to the\nconsole';
  const result = htmlFormat.formatNewLine(input);
  assert.equal(result, expected);
});

it('No new lines without errors', function test() {
  const input =
    'This value may be reduced. If you are seeing "flash read err, 1000" message printed to the\nconsole';
  const expected =
    'This value may be reduced. If you are seeing "flash read err, 1000" message printed to the\nconsole';
  const result = htmlFormat.formatNewLine(input);
  assert.equal(result, expected);
});

it('Apply all formatting', function test() {
  const input =
    'https://srcewe.org/newlib reduced.\n\nPut ``queue_trans`` and:\n\n- 26 MHz\n- 40 MHz\n\nStartup';
  const expected =
    '<a href="https://srcewe.org/newlib">https://srcewe.org/newlib</a> reduced.<br><br>Put <span>queue_trans</span> and:<ul><li> 26 MHz</li><li> 40 MHz<br><br></li></ul>Startup';
  const result = htmlFormat.formatHelpText(input);
  assert.equal(result, expected);
});

