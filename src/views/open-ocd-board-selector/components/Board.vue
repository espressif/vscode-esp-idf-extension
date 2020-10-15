<template>
  <div class="column">
    <div class="card">
      <div class="card-image">
        <figure class="image is-4by3">
          <img
            src="https://bulma.io/images/placeholders/1280x960.png"
            alt="Board image"
          />
        </figure>
      </div>
      <div class="card-content">
        <div class="media">
          <div class="media-content">
            <p class="title">{{ name }}</p>
            <span class="tag">esp-32</span>
          </div>
        </div>

        <div class="content">
          {{ description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class Board extends Vue {
  @Prop() name: String;
  @Prop() description: String;
}
</script>

<style lang="scss">
.card {
  border: 2px solid transparent;
  width: 250px;
  border-radius: 6px;
  cursor: pointer;
}
.card:hover {
  border-color: var(--vscode-button-background);
}
.card-image img {
  border-radius: 6px;
}
.tag {
  text-transform: uppercase;
  background-color: var(--vscode-button-background);
}
.title {
  font-weight: 800;
}
</style>
