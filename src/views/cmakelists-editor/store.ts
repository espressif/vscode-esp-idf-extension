import { defineStore } from "pinia";
import {
  CmakeListsElement,
  CMakeListsType,
} from "../../cmake/cmakeListsElement";
import { Ref, ref } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IState {
  elements: CmakeListsElement[];
  emptyElements: CmakeListsElement[];
  fileName: string;
  cmakeListsType: CMakeListsType;
  selectedElementToAdd: CmakeListsElement;
  textDictionary: {
    add: string;
    save: string;
    discard: string;
    title: string;
  };
}

export const useCMakeListsEditorStore = defineStore("cmakelistsEditor", () => {
  const elements: Ref<CmakeListsElement[]> = ref([] as CmakeListsElement[]);
  const emptyElements: Ref<CmakeListsElement[]> = ref(
    [] as CmakeListsElement[]
  );
  const fileName = ref("");
  const selectedElementToAdd: Ref<CmakeListsElement> = ref(
    {} as CmakeListsElement
  );
  const cmakeListsType: Ref<CMakeListsType> = ref(CMakeListsType.Project);

  const errors: Ref<string[]> = ref([] as string[]);

  const textDictionary = ref({
    add: "Add",
    discard: "Discard",
    save: "Save",
    title: "CMakeLists.txt Editor",
  });

  function addEmptyElement() {
    if (!selectedElementToAdd.value.canHaveMany) {
      const existing = elements.value.some((elem) => {
        return elem.template === selectedElementToAdd.value.template;
      });
      if (existing) {
        return;
      }
    }
    const copyOFSelectElement = ref(
      Object.assign({}, selectedElementToAdd.value)
    );
    if (selectedElementToAdd.value.isFirst) {
      elements.value.unshift(copyOFSelectElement.value);
    } else {
      const lastIndexOfTemplate = elements.value
        .map((e) => e.template)
        .lastIndexOf(selectedElementToAdd.value.template);
      if (lastIndexOfTemplate !== -1) {
        elements.value.splice(
          lastIndexOfTemplate + 1,
          0,
          copyOFSelectElement.value
        );
      } else {
        elements.value.push(copyOFSelectElement.value);
      }
    }
  }

  function checkUniqueVariables() {
    const templateToVariablesMap: Map<string, Set<string>> = new Map();
    for (const elem of elements.value) {
      const { template, variable, value } = elem;
      if (typeof variable === "undefined") {
        continue;
      }
      if (variable === "") {
        errors.value.push(
          `No empty variable name for ${elem.title}. Please use a variable name.`
        );
        return false;
      }
      const valueToCheck = Array.isArray(value) ? value[0]: value;
      if (typeof valueToCheck === "undefined" || valueToCheck === "") {
        errors.value.push(
          `No empty variable value for ${elem.title}. Please use a variable value.`
        );
        return false;
      }
      if (!templateToVariablesMap.has(template)) {
        templateToVariablesMap.set(template, new Set([variable]));
      } else {
        const variableSet = templateToVariablesMap.get(template);
        if (variableSet && variableSet.has(variable)) {
          elem.hasError = true;
          errors.value.push(
            `Duplicated variable name "${variable}" for ${elem.title}. Please change variable name.`
          );
          return false;
        } else {
          variableSet?.add(variable);
        }
      }
    }
    return true;
  }

  function checkIncludeIDFPath() {
    const idfPathIncludeIndex = elements.value.findIndex((elem) => {
      if (elem.template === "include(***)") {
        const valueToCompare = Array.isArray(elem.value) ? elem.value[0]: elem.value;
        return valueToCompare === "$ENV{IDF_PATH}/tools/cmake/project.cmake";
      }
      return false;
    });
    return idfPathIncludeIndex !== -1;
  }

  function sendNewValue(newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  }

  function saveChanges() {
    errors.value = [];
    if (cmakeListsType.value === CMakeListsType.Project) {
      const doesIncludeIdfPathExists = checkIncludeIDFPath();
      if (!doesIncludeIdfPathExists) {
        errors.value.push(
          "Include include(path) for path: $ENV{IDF_PATH}/tools/cmake/project.cmake is missing but required."
        );
      }
      const areVariablesUnique = checkUniqueVariables();
      if (!areVariablesUnique || !doesIncludeIdfPathExists) {
        return;
      }
    }
    vscode.postMessage({
      command: "saveChanges",
      newValues: JSON.stringify(elements.value),
    });
  }

  function requestInitValues() {
    vscode.postMessage({ command: "loadCMakeListSchema" });
  }

  return {
    cmakeListsType,
    elements,
    emptyElements,
    errors,
    fileName,
    selectedElementToAdd,
    textDictionary,
    addEmptyElement,
    sendNewValue,
    saveChanges,
    requestInitValues,
  };
});
