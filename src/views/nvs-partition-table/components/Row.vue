<template>
  <tr :class="{ error: rowError }">
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Key"
        maxlength="15"
        v-model="key"
      />
    </td>
    <td class="w-md">
      <v-select
        :options="types"
        v-model="rowType"
        placeholder="Type"
        taggable
        selectOnTab
        @input="updateEncoding"
      />
    </td>
    <td class="w-md">
      <v-select
        :options="encodingTypes"
        v-model="rowEncoding"
        placeholder="Encoding"
        taggable
        selectOnTab
      />
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Value"
        v-model="value"
      />
    </td>
    <td>
      <a class="delete" @click="del"></a>
      <span
        class="icon is-small has-tooltip-arrow"
        :data-tooltip="rowError"
        v-if="rowError"
      >
        <iconify-icon icon="question" />
      </span>
    </td>
  </tr>
</template>

<script lang="ts">
import { Component, Emit, Prop, PropSync, Vue } from "vue-property-decorator";
import vSelect from "vue-select";

@Component({
  components: {
    "v-select": vSelect,
  },
})
export default class Row extends Vue {
  @PropSync("encoding") rowEncoding: string;
  @PropSync("rowKey") key: String;
  @PropSync("type") rowType: string;
  @PropSync("rowValue") value: String;
  @Prop() rowError: string;

  @Emit("delete")
  del() {}

  findEncodingTypes(type: string) {
    const fileTypes = ["binary", "base64", "hex2bin", "string"];
    switch (type) {
      case "file":
        return fileTypes;
        break;
      case "data":
        return [
          "u8",
          "i8",
          "u16",
          "i16",
          "u32",
          "i32",
          "u64",
          "i64",
          ...fileTypes,
        ];
        break;
      default:
        return [];
        break;
    }
  }

  get encodingTypes() {
    return this.findEncodingTypes(this.rowType);
  }

  get types() {
    return ["data", "file", "namespace"];
  }

  public updateEncoding(newType) {
    const encodingTypes = this.findEncodingTypes(newType);
    if (newType === "namespace") {
      this.rowEncoding = "";
    } else if (encodingTypes.indexOf(this.rowEncoding) === -1) {
      this.rowEncoding = encodingTypes[0];
    }
  }
}
</script>

<style lang="scss">
@import "~vue-select/dist/vue-select.css";
.vs__dropdown-toggle {
  background-color: var(--vscode-input-background);
  border-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
}
.vs__open-indicator,
.vs__clear {
  fill: var(--vscode-button-background);
}
.vs--single .vs__selected {
  color: var(--vscode-foreground);
}
.vs__search {
  color: var(--vscode-foreground);
}
.vs__search::placeholder {
  color: var(--vscode-input-placeholderForeground);
}
.vs__dropdown-menu {
  background-color: var(--vscode-input-background);
  border-color: var(--vscode-input-background);
}
.vs__dropdown-option {
  color: var(--vscode-foreground);
}
.vs__dropdown-option--highlight {
  background-color: var(--vscode-button-background);
  color: var(--vscode-foreground);
}
.w-md {
  min-width: 130px;
}
.error {
  background-color: rgba(176, 81, 41, 0.1);
}
</style>
