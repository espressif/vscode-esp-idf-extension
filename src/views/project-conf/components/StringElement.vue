<template>
  <div class="cmake-element">
    <div class="field">
      <div class="control is-flex">
        <label :for="el.id" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
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
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";

@Component
export default class CMakeListElement extends Vue {
  @Prop() public el: CmakeListsElement;

  @Emit("delete")
  del() {}
}
</script>
