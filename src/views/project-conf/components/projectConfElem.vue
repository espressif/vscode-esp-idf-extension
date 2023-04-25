<template>
  <div class="notification">
    <h2 class="title centerize">{{ title }}</h2>
    <a class="delete" @click="deleteElem"></a>
    <label class="is-size-4 has-text-weight-bold">Build</label>
    <div class="small-margin">
      <ArrayElement
        title="Compile arguments"
        :values.sync="el.build.compileArgs"
        :sections="['build', 'compileArgs']"
        :addValue="addValueToArray"
        :removeValue="removeValueFromArray"
      />
      <ArrayElement
        title="Ninja arguments"
        :values.sync="el.build.ninjaArgs"
        :sections="['build', 'ninjaArgs']"
        :addValue="addValueToArray"
        :removeValue="removeValueFromArray"
      />
      <StringElement
        title="Build Directory path"
        :value.sync="el.build.buildDirectoryPath"
        :sections="['build', 'buildDirectoryPath']"
        :updateMethod="updateElement"
        :openMethod="openBuildDir"
      />
      <ArrayElement
        title="sdkconfig defaults"
        :values.sync="el.build.sdkconfigDefaults"
        :sections="['build', 'sdkconfigDefaults']"
        :addValue="addValueToArray"
        :removeValue="removeValueFromArray"
      />
    </div>
    <DictionaryElement
      title="Environment variables"
      :elements="el.env"
      :sections="['env']"
      :updateMethod="updateElement"
    />
    <StringElement
      title="Flash baud rate"
      :value.sync="el.flashBaudRate"
      :sections="['flashBaudRate']"
      :updateMethod="updateElement"
    />
    <StringElement
      title="Monitor baud rate"
      :value.sync="el.monitorBaudRate"
      :sections="['monitorBaudRate']"
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
        title="Config files"
        :values="el.openOCD.configs"
        :sections="['openOCD', 'configs']"
        :addValue="addValueToArray"
        :removeValue="removeValueFromArray"
      />
      <ArrayElement
        title="Arguments"
        :values="el.openOCD.args"
        :sections="['openOCD', 'args']"
        :addValue="addValueToArray"
        :removeValue="removeValueFromArray"
      />
    </div>

    <label class="is-size-4 has-text-weight-bold">Tasks</label>
    <div class="small-margin">
      <StringElement
        title="Pre Build"
        :value="el.tasks.preBuild"
        :sections="['tasks', 'preBuild']"
        :updateMethod="updateElement"
      />
      <StringElement
        title="Pre Flash"
        :value="el.tasks.preFlash"
        :sections="['tasks', 'preFlash']"
        :updateMethod="updateElement"
      />
      <StringElement
        title="Post Build"
        :value="el.tasks.postBuild"
        :sections="['tasks', 'postBuild']"
        :updateMethod="updateElement"
      />
      <StringElement
        title="Post Flash"
        :value="el.tasks.postFlash"
        :sections="['tasks', 'postFlash']"
        :updateMethod="updateElement"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation } from "vuex-class";
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
  @Action private openBuildPath: (payload: {
    confKey: string;
    sections: string[];
  }) => void;
  @Prop() public el: ProjectConfElement;
  @Prop() public title: string;
  @Mutation updateConfigElement: (payload: {
    confKey: string;
    sections: string[];
    newValue: any;
  }) => void;
  @Mutation addValueToConfigElement: (payload: {
    confKey: string;
    sections: string[];
    valueToAdd: any;
  }) => void;
  @Mutation removeValueFromConfigElement: (payload: {
    confKey: string;
    sections: string[];
    index: any;
  }) => void;

  openOcdDebugLevelOptions: { name: string; value: number }[] = [
    { name: "Error", value: 0 },
    { name: "Warning", value: 1 },
    { name: "Info", value: 2 },
    { name: "Debug", value: 3 },
    { name: "Verbose", value: 4 },
  ];

  updateElement(sections: string[], newValue: any) {
    this.updateConfigElement({ confKey: this.title, sections, newValue });
  }

  openBuildDir(sections: string[]) {
    this.openBuildPath({ confKey: this.title, sections });
  }

  addValueToArray(sections: string[], newValue: any) {
    this.addValueToConfigElement({
      confKey: this.title,
      sections,
      valueToAdd: newValue,
    });
  }

  removeValueFromArray(sections: string[], index: number) {
    this.removeValueFromConfigElement({ confKey: this.title, sections, index });
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
