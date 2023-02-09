<template>
  <div class="notification">
    <h2 class="title centerize">{{ title }}</h2>
    <a class="delete" @click="deleteElem"></a>
    <label class="is-size-4 has-text-weight-bold">Build</label>
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
    <SelectElement
      :selectValue.sync="el.idfTarget"
      :options="idfTargetOptions"
      :customOption="idfTargetCustom"
      :customValueModel.sync="el.customIdfTarget"
      title="IDF Target"
      :sections="['idfTarget']"
      :customValueSections="['customIdfTarget']"
      :updateMethod="updateElement"
    />

    <label class="is-size-4 has-text-weight-bold">OpenOCD</label>
    <div class="small-margin">
      <SelectElement
        :selectValue.sync="el.openOCD.debugLevel"
        title="Debug Level"
        :options="openOcdDebugLevelOptions"
        :sections="['openOCD', 'debugLevel']"
        :updateMethod="updateElement"
      />
      <ArrayElement
        :el="{ title: 'Config files', values: el.openOCD.configs }"
      />
      <ArrayElement :el="{ title: 'Arguments', values: el.openOCD.args }" />
    </div>

    <label class="is-size-4 has-text-weight-bold">Tasks</label>
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
import { Mutation } from "vuex-class";
import ArrayElement from "./ArrayElement.vue";
import DictionaryElement from "./DictionaryElement.vue";
import SelectElement from "./SelectElement.vue";
import StringElement from "./StringElement.vue";
import { ProjectConfElement } from "../../../project-conf/projectConfiguration";

@Component({
  components: {
    ArrayElement,
    DictionaryElement,
    SelectElement,
    StringElement,
  },
})
export default class projectConfElem extends Vue {
  @Prop() public el: ProjectConfElement;
  @Prop() public title: string;
  @Mutation updateConfigElement: (payload: {
    confKey: string;
    sections: string[];
    newValue: any;
  }) => void;

  openOcdDebugLevelOptions: { name: string; value: number }[] = [
    { name: "Error", value: 0 },
    { name: "Warning", value: 1 },
    { name: "Info", value: 2 },
    { name: "Debug", value: 3 },
    { name: "Verbose", value: 4 },
  ];

  idfTargetOptions: { name: string; value: string }[] = [
    { name: "ESP32", value: "esp32" },
    { name: "ESP32 S2", value: "esp32s2" },
    { name: "ESP32 S3", value: "esp32s3" },
    { name: "ESP32 C3", value: "esp32c3" },
    { name: "Custom", value: "custom" },
  ];

  idfTargetCustom = { name: "Custom", value: "custom" };

  isIdfTargetCustom() {
    console.log(this.el.idfTarget);
    return this.el.idfTarget === "custom";
  }

  updateElement(sections: string[], newValue: any) {
    this.updateConfigElement({ confKey: this.title, sections, newValue });
  }

  @Emit("delete")
  deleteElem() {}
}
</script>

<style lang="scss">
.small-margin {
  margin-left: 2em;
}
</style>
