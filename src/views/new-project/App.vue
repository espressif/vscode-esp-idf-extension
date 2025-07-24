<template>
  <div id="init">
    <div class="control">
      <h1 class="title is-spaced">New Project</h1>
    </div>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style lang="scss">
@use "../commons/espCommons.scss" as *;
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
