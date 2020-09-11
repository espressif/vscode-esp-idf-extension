<template>
  <div class="section no-padding-top">
    <div class="container is-mobile">
      <div class="field has-addons">
        <div class="control is-expanded">
          <input
            class="input is-size-7-mobile is-size-7-tablet"
            type="text"
            placeholder="Path to the partition-table.bin file"
            v-model="path"
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
import { Component, Emit, Vue } from "vue-property-decorator";

@Component
export default class PartitionFileSelector extends Vue {
  private path: string;
  @Emit()
  open() {
    return this.path;
  }
}
</script>

<style lang="scss" scoped>
.select,
.input {
  border-color: var(--vscode-input-background);
}
</style>
