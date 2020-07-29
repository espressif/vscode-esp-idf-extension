<template>
  <div>
    <search-bar />
    <div id="main" class="columns">
      <div class="sidenav column is-narrow">
        <ul>
          <sidenav-el v-for="menu in menuItems" :key="menu.id" :menu="menu" />
        </ul>
      </div>

      <div
        class="config-list column"
        v-scroll:throttle="{ fn: onScroll, throttle: 100 }"
      >
        <config-el
          v-for="config in items"
          :key="config.id"
          :config.sync="config"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import "reflect-metadata";
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { Menu } from "../../espIdf/menuconfig/Menu";

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

@Component
export default class Menuconfig extends Vue {
  @State("items") private storeItems!: Menu[];
  @State private searchString!: string;
  @Action private requestInitValues;

  get items() {
    if (this.searchString !== "") {
      let searchStrMatch = /^(?:CONFIG_)?(.+)/.exec(this.searchString);
      let searchMatch =
        searchStrMatch && searchStrMatch.length > 1
          ? searchStrMatch[1].toLowerCase()
          : this.searchString.toLowerCase();
      return filterItems(this.storeItems, searchMatch);
    }
    return this.storeItems;
  }

  get menuItems() {
    return this.storeItems.filter((i) => i.type === "menu");
  }

  public onScroll() {
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

  private mounted() {
    this.requestInitValues();
  }
}
</script>

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
