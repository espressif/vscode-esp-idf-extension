<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { IconChevronRight, IconChevronDown } from "@iconify-prerendered/vue-codicon";
import { useMenuconfigStore } from "../store";
import { Menu } from "../../../espIdf/menuconfig/Menu";

interface TreeItem {
  id: string;
  label: string;
  value: string;
  readonly open: boolean;
  subItems: TreeItem[];
  isVisible?: boolean;
}

const props = defineProps<{
  data: Menu[];
}>();

const emit = defineEmits<{
  (e: 'select', value: string): void;
}>();

const store = useMenuconfigStore();
const openStates = ref<Record<string, boolean>>({});

// Process menu items
const processMenuItems = (items: Menu[]): TreeItem[] => {
  return items
    .filter(item => item.type === "menu" && item.isVisible !== false)
    .map(item => ({
      id: item.id,
      label: item.title,
      value: item.id,
      get open() { return openStates.value[item.id] ?? false; },
      isVisible: item.isVisible,
      subItems: item.children ? processMenuItems(item.children) : []
    }));
};

// Initialize open states
const initializeOpenStates = (items: Menu[]) => {
  if (!items) return;
  items.forEach(item => {
    if (item && item.type === "menu" && item.isVisible !== false) {
      openStates.value[item.id] = false;
      if (item.children && item.children.length > 0) {
        initializeOpenStates(item.children);
      }
    }
  });
};

function toggleItem(item: TreeItem) {
  if (!item) return;
  openStates.value[item.id] = !openStates.value[item.id];
}

function selectItem(item: TreeItem) {
  if (!item) return;
  store.selectedMenu = item.value;
  toggleItem(item);
  emit('select', item.value);
}

const treeData = computed(() => {
  if (!props.data) return [];
  return processMenuItems(props.data);
});

const selectedMenu = computed(() => store.selectedMenu);

onMounted(() => {
  if (props.data) {
    initializeOpenStates(props.data);
  }
});
</script>

<template>
  <div class="settings-tree">
    <ul>
      <li v-for="item in treeData" :key="item.id" class="tree-item">
        <div class="tree-item-content" :class="{ 'has-children': item.subItems && item.subItems.length > 0 }">
          <div v-if="item.subItems && item.subItems.length > 0" class="tree-item-toggle" @click="toggleItem(item)">
            <IconChevronRight v-if="!item.open" />
            <IconChevronDown v-else />
          </div>
          <div v-else class="tree-item-toggle-placeholder"></div>
          <div 
            class="tree-item-label" 
            :class="{ 'selected': selectedMenu === item.value }"
            :data-value="item.value"
            @click="selectItem(item)"
          >
            {{ item.label }}
          </div>
        </div>
        <ul v-if="item.subItems && item.subItems.length > 0 && item.open" class="tree-list">
          <li v-for="subItem in item.subItems" :key="subItem.id" class="tree-item">
            <div class="tree-item-content" :class="{ 'has-children': subItem.subItems && subItem.subItems.length > 0 }">
              <div v-if="subItem.subItems && subItem.subItems.length > 0" class="tree-item-toggle" @click="toggleItem(subItem)">
                <IconChevronRight v-if="!subItem.open" />
                <IconChevronDown v-else />
              </div>
              <div v-else class="tree-item-toggle-placeholder"></div>
              <div 
                class="tree-item-label" 
                :class="{ 'selected': selectedMenu === subItem.value }"
                :data-value="subItem.value"
                @click="selectItem(subItem)"
              >
                {{ subItem.label }}
              </div>
            </div>
            <ul v-if="subItem.subItems && subItem.subItems.length > 0 && subItem.open" class="tree-list">
              <li v-for="nestedItem in subItem.subItems" :key="nestedItem.id" class="tree-item">
                <div class="tree-item-content">
                  <div class="tree-item-toggle-placeholder"></div>
                  <div 
                    class="tree-item-label" 
                    :class="{ 'selected': selectedMenu === nestedItem.value }"
                    :data-value="nestedItem.value"
                    @click="selectItem(nestedItem)"
                  >
                    {{ nestedItem.label }}
                  </div>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.settings-tree {
  font-family: var(--vscode-font-family);
  font-size: 13px;
  color: var(--vscode-foreground);
  user-select: none;
}

.tree-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tree-item {
  margin: 0;
  padding: 0;
}

.tree-item-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 2px;
}

.tree-item-content:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.tree-item-toggle,
.tree-item-toggle-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  flex-shrink: 0;
}

.tree-item-toggle {
  color: var(--vscode-foreground);
  cursor: pointer;
}

.tree-item-toggle:hover {
  color: var(--vscode-foreground);
}

.tree-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}

.tree-item-label.selected {
  font-weight: 900;
}

.tree-item .tree-list {
  padding-left: 10px;
}

.tree-list .tree-list {
  padding-left: 5px;
}
</style>