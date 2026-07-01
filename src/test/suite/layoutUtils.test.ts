import * as assert from "assert";
import {
  sectionCapacityTotal,
  sectionShowsUsagePercent,
} from "../../espIdf/size/layoutUtils";
import { IDFSizeOverviewSection } from "../../espIdf/size/types";

suite("layoutUtils Tests", () => {
  test("sections without capacity total skip usage percent bars", () => {
    const flashCode: IDFSizeOverviewSection = {
      name: "Flash Code",
      total: 0,
      used: 64000,
      free: 0,
      parts: {},
    };

    assert.equal(sectionShowsUsagePercent(flashCode), false);
    assert.equal(sectionCapacityTotal(flashCode), 0);
  });

  test("sections with capacity total show usage percent bars", () => {
    const iram: IDFSizeOverviewSection = {
      name: "IRAM",
      total: 131072,
      used: 51835,
      free: 79237,
      parts: {},
    };

    assert.equal(sectionShowsUsagePercent(iram), true);
    assert.equal(sectionCapacityTotal(iram), 131072);
  });

  test("target-specific memory type names use total field only", () => {
    const lpSram: IDFSizeOverviewSection = {
      name: "LP SRAM",
      total: 16384,
      used: 1200,
      free: 15184,
      parts: {},
    };

    assert.equal(sectionShowsUsagePercent(lpSram), true);
  });
});
