<template>
  <div class="py-1">
    <div class="field">
      <div class="control is-flex">
        <label :for="el.id" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
      </div>
    </div>
    <div class="level">
      <div class="level-item">
        <div class="field fullwidth-field">
          <div class="control">
            <label class="label is-small">Variable</label>
          </div>
          <div class="control">
            <input type="text is-small" v-model="el.variable" class="input" />
          </div>
        </div>
      </div>
      <div class="level-item">
        <div class="field fullwidth-field">
          <div class="control">
            <label class="label is-small">Value</label>
          </div>
          <div class="control">
            <input type="text is-small" v-model="el.value" class="input" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";

@Component
export default class CMakeListsArrayElement extends Vue {
  @Prop() public el: CmakeListsElement;

  @Emit("delete")
  del() {}
}
</script>

<style scoped>
.fullwidth-field {
  width: 90%;
}
</style>
