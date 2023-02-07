<template>
  <div class="project-element">
    <div class="field">
      <div class="control is-flex">
        <label :for="el.value" class="label">{{ el.title }} </label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <input type="text is-small" v-model="el.value" class="input" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class CMakeListElement extends Vue {
  @Prop() public el: { title: string; value: string };

  del() {
    this.el.value = "";
  }
}
</script>
