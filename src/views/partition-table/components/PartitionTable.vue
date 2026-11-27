<script setup lang="ts">
import FlashMap from "./FlashMap.vue";
import { PARTITION_PRESETS } from "../presets";
import { formatByteLabel, formatHexOffset } from "../layout";
import type { FlashSegment, LayoutWarning } from "../layout";

const props = defineProps<{
  segments: FlashSegment[];
  warnings: LayoutWarning[];
  flashSize: number;
  usedBytes: number;
  freeBytes: number;
  partitionTableOffset: number;
  keepEqualOtaSlots: boolean;
}>();

const emit = defineEmits<{
  (e: "add"): void;
  (e: "save"): void;
  (e: "preset", id: string): void;
  (e: "copy"): void;
  (e: "paste"): void;
  (e: "toggleEqualOta", enabled: boolean): void;
}>();

function onPreset(event: Event) {
  const select = event.target as HTMLSelectElement;
  const id = select.value;
  select.value = "";
  if (id) {
    emit("preset", id);
  }
}
</script>
<template>
  <div class="settings-table">
    <div class="flash-panel">
      <p v-if="props.flashSize > 0" class="flash-summary">
        Flash {{ formatByteLabel(props.flashSize) }} · Used
        {{ formatByteLabel(props.usedBytes) }} · Free
        {{ formatByteLabel(props.freeBytes) }} · Partition table
        {{ formatHexOffset(props.partitionTableOffset) }}
      </p>
      <p v-else class="flash-summary">
        Flash size was not found in sdkconfig. Build the project or set
        CONFIG_ESPTOOLPY_FLASHSIZE to show how partitions occupy flash.
      </p>
      <FlashMap v-if="props.segments.length" :segments="props.segments" />
      <ul v-if="props.warnings.length" class="flash-warnings">
        <li v-for="(warning, index) in props.warnings" :key="index">
          {{ warning.message }}
        </li>
      </ul>
    </div>
    <div class="settings-table-header">
      <div class="settings-table-actions">
        <select class="vscode-select preset-select" @change="onPreset">
          <option value="">Partition preset</option>
          <option v-for="preset in PARTITION_PRESETS" :key="preset.id" :value="preset.id">
            {{ preset.label }}
          </option>
        </select>
        <button class="vscode-button" type="button" @click="emit('copy')">
          Copy CSV
        </button>
        <button class="vscode-button" type="button" @click="emit('paste')">
          Paste CSV
        </button>
        <label class="equal-ota">
          <input
            type="checkbox"
            :checked="props.keepEqualOtaSlots"
            @change="emit('toggleEqualOta', ($event.target as HTMLInputElement).checked)"
          />
          Keep equal OTA slots
        </label>
      </div>
      <div class="settings-table-actions">
        <button
          class="vscode-button"
          type="button"
          @click="emit('add')"
        >
          Add New Row
        </button>
        <button
          class="vscode-button"
          type="button"
          @click="emit('save')"
        >
          Save
        </button>
      </div>
    </div>
    <div class="settings-table-content">
      <table class="table is-fullwidth">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Sub Type</th>
            <th>Offset</th>
            <th>Size</th>
            <th>Flags</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <slot></slot>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flash-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.flash-summary {
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}

.flash-warnings {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--vscode-editorWarning-foreground, var(--vscode-editorWarning-foreground));
  font-size: 12px;
}

.settings-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.settings-table-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-select {
  width: auto;
  min-width: 180px;
  height: 28px;
}

.equal-ota {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.settings-table-content {
  overflow-x: auto;
}

.settings-table-content table {
  width: 100%;
  border-collapse: collapse;
}

.settings-table-content th,
.settings-table-content td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.settings-table-content th {
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  background-color: var(--vscode-editor-background);
}
</style>