<script setup lang="ts">
const props = defineProps<{
  active: string;
}>();

const emit = defineEmits<{
  change: [key: string];
}>();

const tabs = [
  { key: "plot", label: "Overview" },
  { key: "details", label: "Details" },
  { key: "stats", label: "Overall Stats" },
  { key: "callStack", label: "Totals" },
];

const tabRefs: HTMLButtonElement[] = [];

function setTabRef(element: unknown, index: number) {
  if (element instanceof HTMLButtonElement) {
    tabRefs[index] = element;
  }
}

function selectTab(key: string) {
  emit("change", key);
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
    return;
  }
  event.preventDefault();
  let next = index;
  if (event.key === "ArrowRight") {
    next = (index + 1) % tabs.length;
  } else if (event.key === "ArrowLeft") {
    next = (index - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    next = 0;
  } else {
    next = tabs.length - 1;
  }
  selectTab(tabs[next].key);
  tabRefs[next]?.focus();
}
</script>

<template>
  <div class="settings-tabs" role="tablist" aria-label="Heap trace report">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      class="settings-tab"
      type="button"
      role="tab"
      :ref="(element) => setTabRef(element, index)"
      :id="`heap-tab-${tab.key}`"
      :aria-selected="props.active === tab.key"
      :tabindex="props.active === tab.key ? 0 : -1"
      @click="selectTab(tab.key)"
      @keydown="onTabKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.settings-tabs {
  display: flex;
  gap: 1px;
  background-color: var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
  overflow: hidden;
}

.settings-tab {
  flex: 1;
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: none;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.1s ease;
}

.settings-tab:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.settings-tab:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
  z-index: 1;
}

.settings-tab[aria-selected="true"] {
  background-color: var(--vscode-tab-activeBackground);
  color: var(--vscode-tab-activeForeground);
  font-weight: 600;
}
</style>
