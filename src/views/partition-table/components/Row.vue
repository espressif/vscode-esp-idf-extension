<template>
  <tr>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Name"
        maxlength="16"
        v-model="sName"
      />
    </td>
    <td>
      <span class="select is-size-7-mobile is-size-7-tablet">
        <select v-model="sType">
          <option value="" disabled>Type</option>
          <option value="app">App</option>
          <option value="data">Data</option>
        </select>
      </span>
    </td>
    <td>
      <!-- <span class="select is-size-7-mobile is-size-7-tablet">
        <select v-model="sSubType">
          <option value="" disabled>Sub Type</option>
          <option v-for="(opt, i) in subtypes" :key="i" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </span> -->
      <v-select
        :options="subtypes"
        v-model="sSubType"
        label="label"
        placeholder="Sub Type"
        taggable
        selectOnTab
      >
      </v-select>
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Offset"
        v-model="sOffset"
      />
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Size"
        v-model="sSize"
      />
    </td>
    <td><input type="checkbox" v-model="sFlag" /></td>
    <td>
      <a class="delete" @click="del"></a>
    </td>
  </tr>
</template>

<script lang="ts">
import "vue-select/dist/vue-select.css";
import { Component, Emit, PropSync, Vue } from "vue-property-decorator";
import { PartitionTable } from "../store";
import vSelect from "vue-select";
Vue.component("v-select", vSelect);

@Component
export default class Row extends Vue {
  @PropSync("name") sName: String;
  @PropSync("type") sType: String;
  @PropSync("subtype") sSubType: String;
  @PropSync("offset") sOffset: String;
  @PropSync("size") sSize: String;
  @PropSync("flag") sFlag: String;

  public get subtypes(): PartitionTable.SubTypesType[] {
    if (this.sType === "app") {
      return [
        { label: "Factory", value: "factory" },
        { label: "OTA 0", value: "ota_0" },
        { label: "OTA 1", value: "ota_1" },
        { label: "OTA 2", value: "ota_2" },
        { label: "OTA 3", value: "ota_3" },
        { label: "OTA 4", value: "ota_4" },
        { label: "OTA 5", value: "ota_5" },
        { label: "OTA 6", value: "ota_6" },
        { label: "OTA 7", value: "ota_7" },
        { label: "OTA 8", value: "ota_8" },
        { label: "OTA 9", value: "ota_9" },
        { label: "OTA 10", value: "ota_10" },
        { label: "OTA 11", value: "ota_11" },
        { label: "OTA 12", value: "ota_12" },
        { label: "OTA 13", value: "ota_13" },
        { label: "OTA 14", value: "ota_14" },
        { label: "OTA 15", value: "ota_15" },
        { label: "Test", value: "test" },
      ];
    } else if (this.sType === "data") {
      return [
        { label: "OTA", value: "ota" },
        { label: "PHY", value: "phy" },
        { label: "NVS", value: "nvs" },
        { label: "NVS Keys", value: "nvs_keys" },
      ];
    }
  }

  @Emit("delete")
  del() {}
}
</script>

<style>
.vs__dropdown-toggle {
  background-color: var(--vscode-input-background);
  border-color: var(--vscode-input-border);
  color: var(--vscode-input-foreground);
}
.vs__open-indicator,
.vs__clear {
  fill: var(--vscode-button-background);
}
</style>
