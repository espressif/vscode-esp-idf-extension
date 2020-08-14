<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class App extends Vue {}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#app {
  text-align: center;
  padding: 1em;
  color: var(--vscode-foreground);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.open-icon {
  color: var(--vscode-button-background);
  margin: 0.5em 0 0 0.5em;
  cursor: pointer;
  font-size: larger;
}
.open-icon:hover {
  color: var(--vscode-button-hoverBackground);
}
</style>
