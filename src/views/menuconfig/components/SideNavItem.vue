<script setup lang="ts">
import { storeToRefs } from "pinia";
import { Menu } from "../../../espIdf/menuconfig/Menu";
import { useMenuconfigStore } from "../store";
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import SideNavItem from "./SideNavItem.vue";

const { menu } = defineProps<{ menu: Menu }>();
const store = useMenuconfigStore();

const { selectedMenu } = storeToRefs(store);

const menuSubItems = computed(() => {
  return menu.children.filter((i) => i.type === "menu" && i.isVisible);
});

function collapse() {
  menu.isCollapsed = !menu.isCollapsed;
}

function setAsSelectedMenu() {
    store.selectedMenu = menu.id;
    const secNew = document.querySelector("#" + this.menu.id) as HTMLElement;
    const configList = document.querySelector(".config-list") as HTMLElement;
    const topbar = document.querySelector("#topbar") as HTMLElement;
    const endPosition =
      secNew.offsetTop +
      configList.clientTop -
      topbar.getBoundingClientRect().bottom;
    configList.scrollTo({ left: 0, top: endPosition - 10, behavior: "auto" });
  }
</script>

<template>
  <li
    :class="{ selectedSection: selectedMenu === menu.id }"
    :href="'#' + menu.id"
  >
    <div class="menu-line">
      <div class="info-icon" @click="collapse" v-show="menuSubItems.length > 0">
        <Icon
          :icon="menu.isCollapsed ? 'chevron-right' : 'chevron-down'"
        />
      </div>
      <p @click="setAsSelectedMenu" v-text="menu.title" />
    </div>
    <ul
      v-for="subItem in menuSubItems"
      :key="subItem.id"
      class="submenu"
      :class="{ collapsed: menu.isCollapsed }"
    >
      <SideNavItem :menu="subItem" />
    </ul>
  </li>
</template>

<style scoped>
.info-icon {
  color: var(--vscode-editor-foreground);
  position: inherit;
  width: 15px;
  height: 15px;
  margin-left: 5px;
  top: 50%;
}
ul > li.selectedSection > div > p,
ul > li.selectedSection > p {
  font-weight: 900;
}
.collapsed {
  max-height: 0;
}
.submenu {
  overflow: hidden;
  padding-left: 20px;
}
.menu-line {
  display: flex;
  align-items: center;
}
.menu-line p {
  margin-left: 0.5em;
}
</style>
