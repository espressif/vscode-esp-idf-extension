<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useMenuconfigStore } from "./store";
import { Menu } from "../../espIdf/menuconfig/Menu";
import ConfigElement from "./components/configElement.vue";
import SearchBar from "./components/SearchBar.vue";
import SettingsTree from "./components/SettingsTree.vue";

const store = useMenuconfigStore();
const isDragging = ref(false);
const treeWidth = ref(400); // Default width in pixels
const minTreeWidth = 300; // Minimum width in pixels
const maxTreeWidth = 600; // Maximum width in pixels
const minContentWidth = 300; // Minimum width in pixels

function throttle<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let throttled = false;
  return function (this: any, ...args: Parameters<T>) {
    if (!throttled) {
      fn.apply(this, args);
      throttled = true;
      setTimeout(() => {
        throttled = false;
      }, wait);
    }
  } as T;
}

function filterItems(items: Menu[], searchString: string) {
  const filteredItems: Menu[] = [];
  items.forEach((item) => {
    if (item.isVisible) {
      if (
        item.isVisible &&
        item.name &&
        item.name.toLowerCase().indexOf(searchString) >= 0
      ) {
        filteredItems.push(item);
      } else if (
        item.isVisible &&
        item.title &&
        item.title.toLowerCase().indexOf(searchString) >= 0
      ) {
        filteredItems.push(item);
      } else {
        const filteredChildren = filterItems(item.children, searchString);
        if (filteredChildren.length > 0) {
          const newItem = Object.assign({}, item);
          if (item.type !== "choice") {
            newItem.children = filteredChildren;
          }
          filteredItems.push(newItem);
        }
      }
    }
  });
  return filteredItems;
}

const items = computed(() => {
  if (store.searchString !== "") {
    let searchStrMatch = /^(?:CONFIG_)?(.+)/.exec(store.searchString);
    let searchMatch =
      searchStrMatch && searchStrMatch.length > 1
        ? searchStrMatch[1].toLowerCase()
        : store.searchString.toLowerCase();
    return filterItems(store.items, searchMatch);
  }
  return store.items;
});

const lastVisibleRootIndex = computed(() => {
  const arr = items.value || [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i]?.isVisible) return i;
  }
  return -1;
});

function onScroll() {
  const configList = document.querySelector(".config-list") as HTMLElement;
  if (!configList) return;

  const sections = Array.from(
    document.querySelectorAll(".submenu.form-group")
  ) as HTMLElement[];
  if (sections.length === 0) return;

  const scrollTop = configList.scrollTop;
  let currentSection: HTMLElement | null = null;
  for (const section of sections) {
    if (section.offsetTop - configList.offsetTop <= scrollTop) {
      currentSection = section;
    } else {
      break;
    }
  }

  if (currentSection) {
    const sectionId = currentSection.id;
    if (sectionId && store.selectedMenu !== sectionId) {
      store.selectedMenu = sectionId;
    }
  }
}

const throttledScrollHandler = throttle((event) => {
  onScroll();
}, 50);

const handleScroll = (event) => {
  throttledScrollHandler(event);
};

function handleMenuSelect(value: string) {
  store.selectedMenu = value;
  const secNew = document.getElementById(value);
  if (secNew) {
    secNew.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  e.preventDefault();
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;

  const mainElement = document.getElementById("main");
  if (!mainElement) return;

  const mainRect = mainElement.getBoundingClientRect();
  const newWidth = e.clientX - mainRect.left;

  if (newWidth >= minTreeWidth && newWidth <= maxTreeWidth) {
    treeWidth.value = newWidth;
  }
}

function handleMouseUp() {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

onMounted(() => {
  store.requestInitValues();
  const scrollableDiv = document.getElementById("scrollable");
  if (scrollableDiv) {
    scrollableDiv.addEventListener("scroll", handleScroll);
  }
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
});

onUnmounted(() => {
  const scrollableDiv = document.getElementById("scrollable");
  if (scrollableDiv) {
    scrollableDiv.removeEventListener("scroll", handleScroll);
  }
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div class="container">
    <SearchBar />
    <div id="main" class="grid-container">
      <div
        class="sidenav"
        :style="{
          width: treeWidth + 'px',
          minWidth: treeWidth + 'px',
          maxWidth: treeWidth + 'px',
        }"
      >
        <SettingsTree :data="store.items" @select="handleMenuSelect" />
      </div>
      <div
        class="resize-handle"
        @mousedown="handleMouseDown"
        :class="{ dragging: isDragging }"
      ></div>
      <div id="scrollable" class="config-list" @scroll="handleScroll">
        <div v-for="(config, index) in items" :key="config.id">
          <ConfigElement :config="config" />
          <div
            class="section-divider"
            v-if="config.isVisible && index !== lastVisibleRootIndex"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "../commons/espCommons.scss" as *;

.field:not(:last-child) {
  margin-bottom: 0 !important;
}

.container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-container {
  display: grid;
  grid-template-columns: auto 4px 1fr;
  height: 90vh;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.resize-handle {
  width: 4px;
  background-color: transparent;
  cursor: col-resize;
  transition: background-color 0.1s;
  z-index: 1;
  position: relative;

  &:hover {
    background-color: var(--vscode-sash-hoverBorder);
  }

  &.dragging {
    background-color: var(--vscode-sash-activeBorder);
  }

  &::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 0;
    width: 12px;
    height: 100%;
    cursor: col-resize;
  }
}

p {
  color: var(--vscode-editor-foreground);
}

.config-list {
  overflow: auto;
  color: var(--vscode-foreground);
  min-width: 300px;
  max-width: 800px;
  padding: 0 0.5rem;
}

.section-divider {
  height: 1px;
  width: 100%;
  background: var(--vscode-panel-border);
  opacity: 0.8;
  margin: 6px 0;
}

.sidenav {
  overflow: auto;
  height: 90vh;
  border-right: 1px solid var(--vscode-panel-border);
  padding: 0 0.5rem;
}

.help-kconfig-title {
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  word-wrap: break-word;
  box-sizing: border-box;
}

.sidenav ul li {
  cursor: pointer;
}

.sidenav ul p {
  text-decoration: none;
  display: block;
}

.sidenav ul p:hover {
  color: var(--vscode-textLink-activeForeground);
}

ul > li {
  list-style-type: none;
}

span {
  color: rgb(231, 76, 60);
  border-style: solid;
  border-color: var(--vscode-settings-textInputForeground);
  border-width: 0.5px;
  padding: 3px;
  display: inline-flex;
}

.content ul li {
  list-style-type: disc;
}
</style>
