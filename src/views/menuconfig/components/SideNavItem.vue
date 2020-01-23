<template>
  <li 
    :class="{ selectedSection: selectedMenu === menu.id }"
    :href="'#' + menu.id"
  >
    <div class="menu-line">
      <font-awesome-icon
        v-if="menu.isCollapsed"
        v-show="menuSubItems.length > 0"
        icon="caret-right"
        class="info-icon"
        @click="collapse"
      />
      <font-awesome-icon
        v-else
        v-show="menuSubItems.length > 0"
        icon="caret-down"
        class="info-icon"
        @click="collapse"
      />
      <p
        @click="setAsSelectedMenu"
        v-text="menu.title"
      />
    </div>
    <ul
      v-for="subItem in menuSubItems"
      :key="subItem.id"
      class="submenu"
      :class="{ collapsed: menu.isCollapsed }"
    >
      <sidenav-el :menu="subItem" />
    </ul>
  </li>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { Menu } from "../../../espIdf/menuconfig/Menu";

@Component
export default class SideNavItem extends Vue {
  @Prop() public menu: Menu;
  @State("selectedMenu") private storeSelectedMenu!: string;
  @Mutation("setSelectedMenu") private setSelectedMenu;

  get selectedMenu() {
    return this.storeSelectedMenu;
  }

  get menuSubItems() {
    return this.menu.children.filter((i) => i.type === "menu" && i.isVisible);
  }

  public collapse() {
    this.menu.isCollapsed = !this.menu.isCollapsed;
  }

  public setAsSelectedMenu() {
    this.setSelectedMenu(this.menu.id);
    const secNew: HTMLElement = document.querySelector("#" + this.menu.id);
    const configList = document.querySelector(".config-list");
    const topbar = document.querySelector("#topbar") as HTMLElement;
    const endPosition = secNew.offsetTop + configList.clientTop - topbar.getBoundingClientRect().bottom;
    configList.scrollTo({ left: 0, top: endPosition, behavior: "auto" });
  }
}
</script>

<style scoped>
  .info-icon {
    color: var(--vscode-editor-foreground);
    position: inherit;
    width: 15px;
    height: 15px;
    margin-left: 5px;
    top: 50%;
  }
  ul > li.selectedSection > div > p, ul > li.selectedSection > p {
    font-weight: 900;
  }
  .collapsed {
    max-height: 0;
  }
  .submenu {
    overflow: hidden;
  }
  .menu-line {
    display: flex;
    align-items: center;
  }
  .menu-line p {
    margin-left: 5%;
    margin-top: 0%;
    margin-bottom: 0.5%;
  }
</style>
