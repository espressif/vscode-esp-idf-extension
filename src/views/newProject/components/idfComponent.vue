<template>
  <div class="idfComponent">
    <label :for="comp.name" v-text="comp.path" />
    <font-awesome-icon
      icon="times"
      class="fa-icon"
      @click="removeComponent(comp)"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { State, Mutation } from "vuex-class";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";

@Component
export default class IdfComponent extends Vue {
  @Prop() private comp: IComponent;
  @Mutation private removeComponent;
}
</script>

<style scoped>
.idfComponent {
  margin: 1vh;
}
.fa-icon {
  margin-left: 1vh;
}
</style>
