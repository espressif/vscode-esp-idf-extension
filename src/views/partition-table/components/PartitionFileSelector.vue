<template>
  <div class="section no-padding-top">
    <div class="container is-mobile">
      <div class="field has-addons">
        <div class="control is-expanded">
          <input
            class="input is-size-7-mobile is-size-7-tablet"
            type="text"
            placeholder="Path to the partition-table.bin file"
            v-model="sPath"
          />
        </div>
        <div class="control">
          <button
            class="button is-size-7-mobile is-size-7-tablet"
            @click="open"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit, PropSync, Vue } from "vue-property-decorator";

@Component
export default class PartitionFileSelector extends Vue {
  @PropSync("path", { type: String, required: true }) sPath: string;

  @Emit()
  open() {
    return this.sPath;
  }
}
</script>

<style lang="scss" scoped>
.select,
.input {
  border-color: var(--vscode-input-background);
}
</style>
