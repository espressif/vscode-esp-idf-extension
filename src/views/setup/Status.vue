<script setup lang="ts">
import { StatusType } from "./types";
import PrerequisitesStatus from "./components/statusSection/prerequisites.vue";
import EspIdfStatus from "./components/statusSection/espIdf.vue";
import EspIdfToolsStatus from "./components/statusSection/espIdfTools.vue";
import PythonPkgsStatus from "./components/statusSection/pyPkgs.vue";
import { useSetupStore } from "./store";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const store = useSetupStore();

const { statusEspIdf, statusEspIdfTools, statusPyVEnv } = storeToRefs(store);

const statusType = computed(() => {
  return StatusType;
});
</script>

<template>
  <div id="status">
    <ul class="statusBar">
      <li
        :class="{
          active: statusEspIdf !== statusType.pending,
          finished: statusEspIdf == statusType.installed,
        }"
      >
        ESP-IDF
      </li>
      <li
        :class="{
          active: statusEspIdfTools !== statusType.pending,
          finished: statusEspIdfTools == statusType.installed,
        }"
      >
        ESP-IDF Tools
      </li>
      <li
        :class="{
          active: statusPyVEnv !== statusType.pending,
          finished: statusPyVEnv == statusType.installed,
        }"
      >
        Python virtual environment
      </li>
    </ul>

    <PrerequisitesStatus />

    <EspIdfStatus />

    <EspIdfToolsStatus />

    <PythonPkgsStatus />
  </div>
</template>

<style>
#status {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.statusBar {
  display: flex;
  width: 100%;
  counter-reset: step;
  align-items: center;
  justify-content: space-around;
  margin: 0.5em;
}

#python-log {
  white-space: pre-line;
}

.statusBar li {
  list-style-type: none;
  width: 30%;
  text-align: center;
}

.statusBar li:before {
  content: counter(step);
  counter-increment: step;
  width: 35px;
  height: 35px;
  display: block;
  text-align: center;
  margin: 0 auto 10px auto;
  border: 2px solid #ddd;
  line-height: 30px;
  border-radius: 50%;
  transition: opacity 1s;
}

.statusBar li:after {
  content: "";
  width: 22%;
  height: 2px;
  top: 7.75em;
  margin-left: 2%;
  background-color: var(--vscode-button-foreground);
  position: absolute;
  transition: opacity 1s;
}

.statusBar li:last-child:after {
  content: none;
}

.statusBar li.active:before,
.statusBar li.active:after {
  color: var(--vscode-button-foreground);
}

.statusBar li.active:before {
  border-color: var(--vscode-button-background);
}

.statusBar li.finished:before {
  background-color: var(--vscode-button-background);
}

.statusBar li.active:after {
  background-color: var(--vscode-button-background);
}

.barText {
  display: flex;
  align-items: center;
  justify-items: center;
  margin: 1em;
}
.icon {
  margin-bottom: 0.5em;
}

.gear {
  animation-name: rotateFrames;
  animation-duration: 5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  transform-origin: 50% 50%;
  display: inline-block;
}

@keyframes rotateFrames {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
