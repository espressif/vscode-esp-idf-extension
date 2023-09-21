<script setup lang="ts">
import { computed } from "vue";
import { IconQuestion } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  sName: string;
  sType: string;
  sSubType: string;
  sOffset: string;
  sSize: string;
  sFlag: boolean;
  error: string;
}>();

const types = computed(() => {
  return ["app", "data"];
});

const subtypes = computed(() => {
  if (props.sType === "app") {
    return [
      "factory",
      "ota_0",
      "ota_1",
      "ota_2",
      "ota_3",
      "ota_4",
      "ota_5",
      "ota_6",
      "ota_7",
      "ota_8",
      "ota_9",
      "ota_10",
      "ota_11",
      "ota_12",
      "ota_13",
      "ota_14",
      "ota_15",
      "test",
    ];
  } else if (props.sType === "data") {
    return ["fat", "ota", "phy", "nvs", "nvs_keys", "spiffs", "coredump"];
  }
  return [];
});
</script>

<template>
  <tr :class="{ error: error }">
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Name"
        maxlength="16"
        :value="sName"
        @input="$emit('updateRow', 'name', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <div class="select is-size-7-mobile is-size-7-tablet">
        <select
          :value="sType"
          @change="$emit('updateRow', 'type', ($event.target as HTMLSelectElement)?.value)"
        >
          <option v-for="t in types" :value="t"> {{ t }}</option>
        </select>
      </div>
    </td>
    <td class="w-md">
      <div class="select is-size-7-mobile is-size-7-tablet">
        <select
          class="select is-size-7-mobile is-size-7-tablet"
          :value="sSubType"
          @change="$emit('updateRow', 'subtype', ($event.target as HTMLSelectElement)?.value)"
        >
          <option v-for="t in subtypes" :value="t"> {{ t }}</option>
        </select>
      </div>
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Offset"
        :value="sOffset"
        @input="$emit('updateRow', 'offset', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Size"
        :value="sSize"
        @input="$emit('updateRow','size', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <input
        type="checkbox"
        :value="sFlag"
        @input="$emit('updateRow', 'flag', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <a class="delete" @click="$emit('delete')"></a>
      <span
        class="icon is-small has-tooltip-arrow"
        :data-tooltip="error"
        v-if="error"
      >
        <IconQuestion />
      </span>
    </td>
  </tr>
</template>

<style>
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
