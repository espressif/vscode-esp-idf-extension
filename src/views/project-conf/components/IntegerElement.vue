<template>
  <div class="integer-element">
    <div class="field">
      <div class="control">
        <label :for="el.value" class="label">{{ el.title }}</label>
        <input
          v-model="el.value"
          type="number"
          class="input is-small"
          placeholder="0"
          max="4"
          min="0"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class IntegerElement extends Vue {
  @Prop() public el: { title: string; value: number };
}
</script>
