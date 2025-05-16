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

// const menuItems = computed(() => {
//   return store.items.filter((i) => i.type === "menu");
// });

const menuItems = computed(() => {
  const items = store.items.filter((i) => i.type === "menu");
  const arrItems = items.map((item) => {
    const newItem: {
      id: string;
      label: string;
      value: string;
      open: boolean;
      subItems: {
        id: string;
        label: string;
        subItems: {
          id: string;
          label: string;
          subItems: Menu[];
          value: string;
        }[];
        value: string;
      }[];
    } = {
      id: item.id,
      label: item.title,
      value: item.id,
      open: true,
      subItems: [],
    };
    const modifiedChildren: {
      id: string;
      label: string;
      value: string;
      open: boolean;
      subItems: {
        id: string;
        label: string;
        subItems: Menu[];
        value: string;
      }[];
    }[] = [];
    for (const child of item.children.filter((i) => i.type === "menu")) {
      const newChild: {
        id: string;
        label: string;
        value: string;
        open: boolean;
        subItems: {
          id: string;
          label: string;
          subItems: Menu[];
          value: string;
        }[];
      } = {
        id: child.id,
        label: child.title,
        value: child.id,
        open: child.children && child.children.length > 0,
        subItems: [],
      };
      const nestedChildren: {
        id: string;
        label: string;
        value: string;
        open: boolean;
        subItems: Menu[];
      }[] = [];
      for (const nestedChild of child.children.filter(
        (i) => i.type === "menu"
      )) {
        const newNestedChild = {
          id: nestedChild.id,
          label: nestedChild.title,
          value: nestedChild.id,
          open: nestedChild.children && nestedChild.children.length > 0,
          subItems: nestedChild.children.filter((i) => i.type === "menu"),
        };
        nestedChildren.push(newNestedChild);
      }
      newChild.subItems = nestedChildren;
      modifiedChildren.push(newChild);
    }
    newItem.subItems = modifiedChildren;
    return newItem;
  });
  return arrItems;
});

function onScroll() {
  const tree = document.getElementById("sideNavMenus");
  if (!tree || !tree.shadowRoot) {
    console.warn("vscode-tree or its shadowRoot not found.");
    return;
  }

  // Access the shadow root of the vscode-tree
  const shadowRoot = tree.shadowRoot;
  Array.from(
    shadowRoot.querySelectorAll<HTMLElement>("div ul li div span")
  ).forEach((el) => {
    const sectionName: string = el.textContent || "";
    const refElement = Array.from(
      document.querySelectorAll(".submenu.form-group h4.subtitle")
    ).find((elem) => elem.textContent === sectionName) as HTMLElement;
    const topbar = document.querySelector("#topbar") as HTMLElement;
    if (
      refElement &&
      topbar &&
      refElement.getBoundingClientRect().top -
        topbar.getBoundingClientRect().bottom <
        topbar.offsetHeight
    ) {
      Array.from(
        shadowRoot.querySelectorAll<HTMLElement>("div ul li div span")
      ).forEach((menu) => {
        menu.style.fontWeight = "400";
      });
      el.style.fontWeight = "900";
    } else {
      el.style.fontWeight = "400";
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
  const tree = document.getElementById("sideNavMenus");
  if (tree) {
    tree.addEventListener("vsc-tree-select", (event) => {
      store.selectedMenu = event.detail.value; // Set the selected menu id
      const secNew = document.querySelector(
        "#" + event.detail.value
      ) as HTMLElement;
      const configList = document.querySelector(".config-list") as HTMLElement;
      const topbar = document.querySelector("#topbar") as HTMLElement;
      const endPosition =
        secNew.offsetTop +
        configList.clientTop -
        topbar.getBoundingClientRect().bottom;
      configList.scrollTo({ left: 0, top: endPosition - 10, behavior: "auto" });
    });
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
        <!-- <ul>
          <SideNavItem v-for="menu in menuItems" :key="menu.id" :menu="menu" />
        </ul> -->
        <vscode-tree id="sideNavMenus" :data="menuItems" indent-guides arrows>
        </vscode-tree>
      </div>

      <div id="scrollable" class="config-list column" @scroll="handleScroll">
        <ConfigElement
          :config="config"
          v-for="config in items"
          :key="config.id"
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
