<script setup lang="ts">
import { useNewSizeStore } from "../store";
import { IconSymbolEvent } from "@iconify-prerendered/vue-codicon";
const store = useNewSizeStore();
</script>

<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF</strong>&nbsp;Size Analysis
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <button
                class="button"
                title="Flash"
                v-on:click="store.flashClicked"
                v-bind:disabled="store.isFlashing"
              >
                <span class="icon">
                  <IconSymbolEvent />
                </span>
                &nbsp; Flash
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        Size analysis will provide users with in-depth analysis of the binary
        file generated from the project.
      </p>
    </div>
  </header>
</template>
