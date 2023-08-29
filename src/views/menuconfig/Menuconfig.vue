<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useMenuconfigStore } from "./store";
import { Menu } from "../../espIdf/menuconfig/Menu";
import ConfigElement from "./components/configElement.vue";
import SearchBar from "./components/SearchBar.vue";
import SideNavItem from "./components/SideNavItem.vue";

const store = useMenuconfigStore();

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
          newItem.children = filteredChildren;
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

const menuItems = computed(() => {
  return store.items.filter((i) => i.type === "menu");
});

function onScroll() {
  Array.from(document.querySelectorAll(".sidenav li")).forEach((el) => {
    const sectionId: string = el.getAttribute("href") || "";
    const refElement = document.querySelector(sectionId);
    const topbar = document.querySelector("#topbar") as HTMLElement;
    if (
      refElement &&
      topbar &&
      refElement.getBoundingClientRect().top -
        topbar.getBoundingClientRect().bottom <
        topbar.offsetHeight
    ) {
      Array.from(document.querySelectorAll(".sidenav li")).forEach((menu) =>
        menu.classList.remove("selectedSection")
      );
      el.classList.add("selectedSection");
    } else {
      el.classList.remove("selectedSection");
    }
  });
}

const throttledScrollHandler = throttle((event) => {
  onScroll();
}, 100);

const handleScroll = (event) => {
  throttledScrollHandler(event);
};

onMounted(() => {
  store.requestInitValues();
  const scrollableDiv = document.getElementById("scrollable");
  if (scrollableDiv) {
    scrollableDiv.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  const scrollableDiv = document.getElementById("scrollable");
  if (scrollableDiv) {
    scrollableDiv.removeEventListener("scroll", handleScroll);
  }
});
</script>

<template>
  <div>
    <SearchBar />
    <div id="main" class="columns">
      <div class="sidenav column is-narrow">
        <ul>
          <SideNavItem v-for="menu in menuItems" :key="menu.id" :menu="menu" />
        </ul>
      </div>

      <div id="scrollable" class="config-list column" @scroll="handleScroll">
        <ConfigElement
          v-for="config in items"
          :key="config.id"
          :config.sync="config"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";

#main {
  display: flex;
  height: 90vh;
  margin: auto;
}
p {
  color: var(--vscode-editor-foreground);
}
.config-list {
  overflow: auto;
  margin-left: 1%;
  color: var(--vscode-foreground);
}
.sidenav {
  overflow: auto;
  height: 90vh;
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
