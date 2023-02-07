<template>
  <div class="notification">
    <h2 class="title centerize">{{ title }}</h2>
    <a class="delete" @click="deleteElem"></a>
    <label class="label">Build</label>
    <div class="small-margin">
      <ArrayElement
        :el="{ title: 'Compile arguments', values: el.build.compileArgs }"
      />
      <ArrayElement
        :el="{ title: 'Ninja arguments', values: el.build.ninjaArgs }"
      />
      <StringElement
        :el="{
          title: 'Build Directory path',
          value: el.build.buildDirectoryPath,
        }"
      />
      <ArrayElement
        :el="{
          title: 'sdkconfig defaults',
          values: el.build.sdkconfigDefaults,
        }"
      />
    </div>
    <DictionaryElement
      :el="{ title: 'Environment variables', elements: el.env }"
    />
    <StringElement
      :el="{ title: 'Flash baud rate', value: el.flashBaudRate }"
    />
    <StringElement :el="{ title: 'IDF target', value: el.idfTarget }" />

    <label class="label">OpenOCD</label>
    <div class="small-margin">
      <IntegerElement
        :el="{ title: 'Debug Level', value: el.openOCD.debugLevel }"
      />
      <ArrayElement
        :el="{ title: 'Config files', values: el.openOCD.configs }"
      />
      <ArrayElement :el="{ title: 'Arguments', values: el.openOCD.args }" />
    </div>

    <label class="label">Tasks</label>
    <div class="small-margin">
      <StringElement :el="{ title: 'Pre Build', value: el.tasks.preBuild }" />
      <StringElement :el="{ title: 'Pre Flash', value: el.tasks.preFlash }" />
      <StringElement :el="{ title: 'Post Build', value: el.tasks.postBuild }" />
      <StringElement :el="{ title: 'Post Flash', value: el.tasks.postFlash }" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import ArrayElement from "./ArrayElement.vue";
import DictionaryElement from "./DictionaryElement.vue";
import IntegerElement from "./IntegerElement.vue";
import StringElement from "./StringElement.vue";
import { ProjectConfElement } from "../../../project-conf/projectConfiguration";

@Component({
  components: {
    ArrayElement,
    DictionaryElement,
    IntegerElement,
    StringElement,
  },
})
export default class projectConfElem extends Vue {
  @Prop() public el: ProjectConfElement;
  @Prop() public title: string;

  @Emit("delete")
  deleteElem() {}
}
</script>

<style lang="scss">
.small-margin {
  margin-left: 2em;
}
</style>
