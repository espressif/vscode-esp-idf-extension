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

<style>
#init {
  max-width: 900px;
  margin: 1% auto 1% auto;
  padding-top: 3%;
  text-align: center;
  cursor: default;
  display: flex;
  align-items: center;
  flex-direction: column;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
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
.group {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin: 1em;
}
.group label {
  margin: 0.5em;
}
.right {
  -webkit-transform: rotate(-135deg);
  transform: rotate(-135deg);
}

.button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  text-decoration: none;
  transition: opacity 0.5s ease 1s;
  border: none;
  cursor: pointer;
  width: -webkit-fill-available;
  width: 15em;
  padding: 0.5em;
  margin: 1em;
  vertical-align: super;
}

.button:hover {
  background-color: var(--vscode-button-hoverBackground);
  box-shadow: 1px 0 5px var(--vscode-editor-foreground);
}
</style>
