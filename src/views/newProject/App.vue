<template>
  <div id="init">
    <transition name="fade" mode="out-in">
      <router-view />
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";

export default class App extends Vue {
  @Action private requestInitValues;
  private mounted() {
    this.requestInitValues();
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
#init {
  padding-top: 1em;
  text-align: center;
  cursor: default;
  display: flex;
  align-items: center;
  flex-direction: column;
  margin: auto;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.centerize {
  display: flex;
  align-items: center;
  flex-direction: column;
}
.fa-icon {
  color: var(--vscode-editor-foreground);
  cursor: pointer;
  font-size: larger;
}
.fa-icon:hover {
  color: var(--vscode-button-hoverBackground);
}
</style>
