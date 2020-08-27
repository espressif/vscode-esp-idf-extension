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

.progressBar {
  width: 50%;
}

.progressBar div {
  background-color: var(--vscode-button-background);
  height: 10px;
  width: 0%;
}
</style>
