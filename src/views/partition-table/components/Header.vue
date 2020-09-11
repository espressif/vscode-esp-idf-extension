<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF</strong>
              <span>Partition Table Editor</span>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <a class="button" href="command:espIdf.flash">
                <span class="icon is-small">
                  <i class="fas fa-bolt"></i>
                </span>
                &nbsp; Flash
              </a>
              <button class="button" title="Retry">
                <span class="icon is-small">
                  <i class="fas fa-redo"></i>
                </span>
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        Partition Editor will help users to easily edit partition table through
        GUI, and quickly flash the same.
      </p>
    </div>
  </header>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
@Component
export default class Header extends Vue {}
</script>
