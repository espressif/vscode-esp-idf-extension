<template>
  <div class="welcome-section">
    <div class="content-wrap">
      <ul class="fly-in-text">
        <li>ESPRESSIF</li>
      </ul>
      <p>
        Before using this extension,
        <a href="https://git-scm.com/downloads">Git</a>
        and <a href="https://www.python.org/downloads">Python</a> are required.
        <br />
        Please read
        <a
          href="https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites"
        >
          ESP-IDF Prerequisites.
        </a>
      </p>
      <p v-if="isNotWinPlatform">
        <a href="https://cmake.org/download/">CMake</a> and
        <a href="https://github.com/ninja-build/ninja/releases">Ninja</a> are
        required in environment PATH.
      </p>
      <ConfigurationTarget />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import ConfigurationTarget from "./components/ConfigurationTarget.vue";

@Component({
  components: {
    ConfigurationTarget,
  },
})
export default class Home extends Vue {
  get isNotWinPlatform() {
    return navigator.platform.indexOf("Win") < 0;
  }
}
</script>

<style scoped>
.welcome-section {
  font-family: "Open Sans", Arial, sans-serif;
  font-weight: 700;
  overflow: hidden;
}
.welcome-section .content-wrap {
  position: relative;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
}

.welcome-section .content-wrap .fly-in-text {
  list-style: none;
}

.welcome-section .content-wrap .fly-in-text li {
  display: inline-block;
  margin-right: 30px;
  font-size: 3em;
  color: var(--vscode-editor-foreground);
  opacity: 1;
  transition: all 1s ease;
}

.welcome-section .content-wrap .fly-in-text li::last-child(n) {
  margin-right: 0;
}

@media (min-width: 800px) {
  .welcome-section .content-wrap .fly-in-text li {
    font-size: 5em;
  }
}
</style>
