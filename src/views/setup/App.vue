<template>
  <div id="app">
    <div class="control centerize" v-if="!isInstalled">
      <div class="icon">
        <router-link to="/" class="button">
          <i class="codicon codicon-home"></i>
        </router-link>
      </div>
    </div>
    <h1 class="title">ESPRESSIF</h1>
    <transition name="fade" mode="out-in" v-if="!isInstalled">
      <router-view></router-view>
    </transition>
    <div class="install-finished" v-if="isInstalled">
      <h2 class="subtitle">
        ESP-IDF have been configured for this extension of Visual Studio Code.
      </h2>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";

@Component
export default class App extends Vue {
  @State("isIdfInstalled") private storeIsInstalled: boolean;
  get isInstalled() {
    return this.storeIsInstalled;
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#app {
  text-align: center;
  padding: 1em;
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  height: -webkit-fill-available;
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
  align-self: flex-start;
}
</style>
