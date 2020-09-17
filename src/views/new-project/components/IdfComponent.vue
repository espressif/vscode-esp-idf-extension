<template>
  <div class="field is-grouped is-grouped-centered">
    <label :for="comp.name" v-text="comp.path" />
    <div class="control icon">
      <div class="icon">
        <i class="codicon codicon-close" @click="removeComponent(comp)"></i>
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
