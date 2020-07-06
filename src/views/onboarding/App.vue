<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class App extends Vue {
  @Action private requestInitValues;

  private mounted() {
    this.requestInitValues();
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#app {
  text-align: center;
  padding: 1em;
  color: var(--vscode-foreground);
}

.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
}

.arrow {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  color: var(--vscode-editor-foreground);
  box-sizing: border-box;
}

.arrow:before {
  content: "";
  box-sizing: border-box;
}

.arrow:hover {
  color: var(--vscode-button-background);
}

.check-icon {
  fill: var(--vscode-editor-foreground);
  padding-top: 5%;
  font-size: large;
}

.go-back {
  width: 20px;
  height: 20px;
  border-width: 4px 4px 0 0;
  border-style: solid;
  margin: 10px;
  cursor: pointer;
}

.go-back:before {
  right: 0;
  top: -3px;
  position: absolute;
  height: 4px;
  box-shadow: inset 0 0 0 32px;
  -webkit-transform: rotate(-45deg);
  transform: rotate(-45deg);
  width: 23px;
  -webkit-transform-origin: right top;
  transform-origin: right top;
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

.progressBar div {
  background-color: var(--vscode-button-background);
  height: 10px;
  width: 0%;
}

.right {
  -webkit-transform: rotate(-135deg);
  transform: rotate(-135deg);
}

.text-size {
  width: 80%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
