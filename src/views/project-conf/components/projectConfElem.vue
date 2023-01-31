<template>
  <div>
    <ArrayElement :el="el" v-if="el.type === 'array'" @delete="deleteElem" />
    <StringElement :el="el" v-if="el.type === 'string'" @delete="deleteElem" />
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import ArrayElement from "./ArrayElement.vue";
import StringElement from "./StringElement.vue";
import { ProjectConfElement } from "../../../project-conf/projectConfiguration";

@Component({
  components: {
    ArrayElement,
    StringElement,
  }
})
export default class projectConfElem extends Vue {
  @Prop() public el: ProjectConfElement;

  @Emit("delete")
  deleteElem() {}
}
</script>