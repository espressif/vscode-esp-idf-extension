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
  analyzeHeapTrace,
  buildHeapPlotTraces,
  eventMatchesHeapFilter,
  filterHeapDetails,
  HeapTraceEvent,
  HeapTraceInput,
  TOTAL_SERIES_NAME,
} from "../../views/tracing/heapTraceModel";

const ALLOC = 1;
const FREE = 2;

function trace(events: HeapTraceEvent[]): HeapTraceInput {
  return {
    streams: { heap: { alloc: ALLOC, free: FREE } },
    events,
  };
}

suite("Heap trace model", () => {
  test("matches a free to its allocation and drops the leak", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x1000", size: 16, ctx_name: "main" },
        { id: FREE, ts: 2, addr: "0x1000", ctx_name: "main" },
      ])
    );

    assert.strictEqual(analysis.leaks.length, 0);
    assert.strictEqual(analysis.summary.persistentBytes, 0);
    assert.strictEqual(analysis.summary.persistentCount, 0);
    assert.strictEqual(analysis.summary.transientCount, 1);
    assert.strictEqual(analysis.summary.totalBytes, 16);
    assert.strictEqual(analysis.summary.totalCount, 1);
    assert.deepStrictEqual(analysis.total.x, [1, 2]);
    assert.deepStrictEqual(analysis.total.y, [16, 0]);
    assert.strictEqual(analysis.details[1].kind, "free");
    assert.strictEqual(analysis.details[1].size, 16);
    assert.strictEqual(analysis.details[0].possibleLeak, false);
  });

  test("starts a new lifetime when an address is reused after free", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x1000", size: 10, ctx_name: "main" },
        { id: FREE, ts: 2, addr: "0x1000", ctx_name: "main" },
        { id: ALLOC, ts: 3, addr: "0x1000", size: 20, ctx_name: "main" },
      ])
    );

    assert.strictEqual(analysis.leaks.length, 1);
    assert.strictEqual(analysis.leaks[0].size, 20);
    assert.strictEqual(analysis.leaks[0].timestamp, 3);
    assert.deepStrictEqual(analysis.total.y, [10, 0, 20]);
    assert.strictEqual(analysis.summary.persistentBytes, 20);
    assert.strictEqual(analysis.summary.totalBytes, 30);
  });

  test("keeps the older allocation leaked when its address is reused without a free", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x1000", size: 5, ctx_name: "main" },
        { id: ALLOC, ts: 2, addr: "0x1000", size: 9, ctx_name: "main" },
        { id: FREE, ts: 3, addr: "0x1000", ctx_name: "main" },
      ])
    );

    assert.strictEqual(analysis.leaks.length, 1);
    assert.strictEqual(analysis.leaks[0].size, 5);
    assert.strictEqual(analysis.leaks[0].timestamp, 1);
    assert.deepStrictEqual(analysis.total.y, [5, 14, 5]);
    assert.strictEqual(analysis.summary.persistentBytes, 5);
  });

  test("applies a free to the context that allocated the block", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x10", size: 8, ctx_name: "reader" },
        { id: FREE, ts: 2, addr: "0x10", size: 1, ctx_name: "writer" },
      ])
    );

    const reader = analysis.series.find(
      (series) => series.context === "reader"
    );
    const writer = analysis.series.find(
      (series) => series.context === "writer"
    );
    assert.deepStrictEqual(reader?.y, [8, 0]);
    assert.strictEqual(writer, undefined);
    assert.deepStrictEqual(analysis.total.y, [8, 0]);
    assert.strictEqual(analysis.details[1].context, "writer");
    assert.strictEqual(analysis.details[1].size, 8);
    assert.strictEqual(analysis.leaks.length, 0);
  });

  test("does not change running totals for an unmatched free", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x10", size: 4, ctx_name: "main" },
        { id: FREE, ts: 2, addr: "0x99", size: 4, ctx_name: "main" },
      ])
    );

    assert.deepStrictEqual(analysis.total.y, [4]);
    assert.strictEqual(analysis.details.length, 2);
    assert.strictEqual(analysis.details[1].kind, "free");
    assert.strictEqual(analysis.details[1].possibleLeak, false);
    assert.strictEqual(analysis.leaks.length, 1);
    assert.strictEqual(analysis.summary.persistentBytes, 4);
  });

  test("sorts events by timestamp before building series", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 3, addr: "0x2", size: 4, ctx_name: "main" },
        { id: ALLOC, ts: 1, addr: "0x1", size: 10, ctx_name: "main" },
      ])
    );

    assert.deepStrictEqual(analysis.total.x, [1, 3]);
    assert.deepStrictEqual(analysis.total.y, [10, 14]);
  });

  test("filters details to possible leaks", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x1", size: 2, ctx_name: "main" },
        { id: FREE, ts: 2, addr: "0x1", ctx_name: "main" },
        { id: ALLOC, ts: 3, addr: "0x2", size: 6, ctx_name: "main" },
      ])
    );

    const leaks = filterHeapDetails(analysis.details, true);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].address, "0x2");
    assert.strictEqual(filterHeapDetails(analysis.details, false).length, 3);
  });

  test("hides a context trace without dropping it", () => {
    const analysis = analyzeHeapTrace(
      trace([
        { id: ALLOC, ts: 1, addr: "0x1", size: 3, ctx_name: "wifi" },
        { id: ALLOC, ts: 2, addr: "0x2", size: 5, ctx_name: "ble" },
      ])
    );
    const traces = buildHeapPlotTraces(analysis, {
      total: true,
      contexts: { wifi: false, ble: true },
    });

    const total = traces.find((series) => series.name === TOTAL_SERIES_NAME);
    const wifi = traces.find((series) => series.name === "wifi");
    const ble = traces.find((series) => series.name === "ble");
    assert.strictEqual(total?.visible, true);
    assert.strictEqual(wifi?.visible, false);
    assert.deepStrictEqual(wifi?.y, [3]);
    assert.strictEqual(ble?.visible, true);
    assert.notStrictEqual(wifi?.line.color, ble?.line.color);
  });

  test("matches irq allocation filters and ignores empty callers", () => {
    const alloc: HeapTraceEvent = {
      id: ALLOC,
      ts: 1,
      addr: "0x1",
      size: 1,
      ctx_name: "main",
      in_irq: true,
      callers: ["0x0", "0x4000"],
    };
    const free: HeapTraceEvent = {
      id: FREE,
      ts: 2,
      addr: "0x1",
      ctx_name: "main",
      in_irq: true,
      callers: ["0x4001"],
    };
    const ids = { alloc: ALLOC, free: FREE };

    assert.strictEqual(
      eventMatchesHeapFilter(alloc, "irq-allocations", ids),
      true
    );
    assert.strictEqual(
      eventMatchesHeapFilter(free, "irq-allocations", ids),
      false
    );
    assert.strictEqual(eventMatchesHeapFilter(free, "irq-free", ids), true);
    assert.strictEqual(eventMatchesHeapFilter(alloc, "unknown", ids), false);

    const analysis = analyzeHeapTrace(trace([alloc, free]));
    assert.deepStrictEqual(analysis.callerAddresses, ["0x4000", "0x4001"]);
    assert.deepStrictEqual(analysis.callStacks, [["0x4000"], ["0x4001"]]);
  });

  test("returns no rows when the heap stream ids are missing", () => {
    const analysis = analyzeHeapTrace({ events: [{ id: 1, ts: 1, size: 1 }] });
    assert.strictEqual(analysis.details.length, 0);
    assert.strictEqual(analysis.total.x.length, 0);
  });

  test("accepts numeric event ids that match string stream ids", () => {
    const analysis = analyzeHeapTrace({
      streams: { heap: { alloc: "1", free: "2" } },
      events: [
        { id: 1, ts: 1.5, addr: "0x20", size: 7, ctx_name: "main", core_id: 0 },
      ],
    });

    assert.strictEqual(analysis.details.length, 1);
    assert.strictEqual(analysis.details[0].possibleLeak, true);
    assert.strictEqual(analysis.details[0].core, "0");
    assert.strictEqual(analysis.details[0].inIrq, false);
    assert.deepStrictEqual(analysis.total.x, [1.5]);
    assert.deepStrictEqual(analysis.total.y, [7]);
  });
});
