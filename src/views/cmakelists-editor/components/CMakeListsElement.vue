<template>
  <div>
    <ArrayElement :el="el" v-if="el.type === 'array'" @delete="deleteElem" />
    <BinaryDataElement
      :el="el"
      v-if="el.type === 'binary_data'"
      @delete="deleteElem"
    />
    <SetElement :el="el" v-if="el.type === 'set'" @delete="deleteElem" />
    <StringElement :el="el" v-if="el.type === 'string'" @delete="deleteElem" />
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import ArrayElement from "./ArrayElement.vue";
import BinaryDataElement from "./BinaryDataElement.vue";
import SetElement from "./SetElement.vue";
import StringElement from "./StringElement.vue";

@Component({
  components: {
    ArrayElement,
    BinaryDataElement,
    SetElement,
    StringElement,
  },
})
export default class CMakeListElement extends Vue {
  @Prop() public el: CmakeListsElement;

  @Emit("delete")
  deleteElem() {}
}
</script>
