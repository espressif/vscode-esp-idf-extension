<script setup lang="ts"></script>

<template>
  <div id="init">
    <div class="control">
      <h1 class="title is-spaced">New Project</h1>
    </div>
    <transition name="fade" mode="out-in">
      <router-view />
    </transition>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";
#init {
  cursor: default;
  margin: auto;
  padding-top: 1em;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.title {
  text-align: center;
}
</style>
