<template>
  <div class="field is-grouped">
    <label class="label" :for="comp.name" v-text="comp.path" />
    <div class="control icon">
      <div class="icon is-large is-size-4">
        <iconify-icon icon="close" @click="removeComponent(comp)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State, Mutation } from "vuex-class";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";

@Component
export default class IdfComponent extends Vue {
  @Prop() private comp: IComponent;
  @Mutation private removeComponent;
}
</script>

<style></style>
