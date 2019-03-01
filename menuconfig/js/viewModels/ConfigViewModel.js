define(
  ['knockout', 'MenuViewModel', 'jquery'],
  (ko, MenuViewModel, $) => function ConfigViewModel() {
    const self = this;
    self.configMenues = ko.observableArray();
    self.searchResults = ko.observableArray();
    self.selectedConfigMenu = ko.observable();
    self.selectedMenuName = ko.observable('SDK Tool configuration');
    self.selectedMenuSection = ko.observable('sdkTool');
    self.configSubMenues = ko.observableArray().extend({ deferred: true });
    self.query = ko.observable('');
    self.configStates = ko.observableArray(['loading', 'initialized', 'error']);
    self.configCurrentState = ko.observable('loading');
    /* global acquireVsCodeApi:true */
    const vscode = acquireVsCodeApi();

    self.updateValues = function updateValues(newValues) {
      ko.utils.arrayForEach(self.configMenues(), (menu) => {
        if (menu.name() in newValues.values) {
          menu.setValue(newValues.values[menu.name()]);
        }
        ko.utils.arrayForEach(menu.submenues(), (submenu) => {
          submenu.setValues(newValues);
        });
      });
    };

    self.search = function search(value) {
      if (value !== '') {
        const resultConfigMenues = ko.observableArray();
        const resultParams = ko.observableArray();
        ko.utils.arrayForEach(self.configMenues(), (menu) => {
          if (menu.name() !== null && menu.name() !== undefined &&
          menu.name().toLowerCase().indexOf(value.toLowerCase()) >= 0) {
            resultConfigMenues.push(menu);
          } else if (menu.title() !== null && menu.title() !== undefined &&
          menu.title().toLowerCase().indexOf(value.toLowerCase()) >= 0) {
            resultConfigMenues.push(menu);
          } else {
            ko.utils.arrayForEach(menu.submenues(), (submenu) => {
              const subResults = submenu.search(value);
              ko.utils.arrayForEach(subResults(), (subResult) => {
                resultParams.push(subResult);
              });
            });
          }
        });
        const containerMenu = new MenuViewModel();
        containerMenu.title(`Parameters results for: ${value}`);
        containerMenu.submenues(resultParams());
        resultConfigMenues.push(containerMenu);
        self.searchResults(resultConfigMenues());
      } else if (self.searchResults() && self.searchResults().length > 0) {
        self.searchResults.removeAll();
      }
    };

    self.goToSection = function goToSection(sec) {
      if (self.searchResults() && self.searchResults().length > 0) {
        return;
      }
      self.selectedMenuSection(sec.title());
      self.selectedMenuName(sec.title());
      self.selectedConfigMenu(sec);
      const secNew = `#${sec.nameId()}`;
      const endPosition = $(secNew).position().top + $('.another').scrollTop();
      $('.another').animate({ scrollTop: endPosition }, 'slow');
    };

    self.updateSelectConf = function updateSelectConf(obj) {
      const value = obj.selectedValue();
      const args = {
        paramName: value.choiceName,
        newValue: true,
        comp_folder: self.selectedMenuSection(),
      };
      vscode.postMessage({
        command: 'updateValue',
        text: args,
      });
    };

    self.updateConf = function updateConf(obj) {
      let value = Object.hasOwnProperty.call(obj, 'isChecked') ? obj.isChecked() : obj.chosenValue();
      if (obj.isText) {
        value = `"${value}"`;
      }
      const args = {
        paramName: obj.name(),
        newValue: value,
        comp_folder: self.selectedMenuSection(),
      };
      vscode.postMessage({
        command: 'updateValue',
        text: args,
      });
    };

    self.saveConfChanges = function saveConfChanges() {
      vscode.postMessage({
        command: 'saveChanges',
      });
    };

    self.resetConf = function resetConf() {
      vscode.postMessage({
        command: 'discardsChanges',
      });
    };

    self.setDefaultConf = function setDefaultConf() {
      vscode.postMessage({
        command: 'setDefault',
      });
    };

    self.requestInitValues = function requestInitValues() {
      if ($('#compList').children().length === self.configMenues().length) {
        vscode.postMessage({
          command: 'reqInitValues',
        });
      }
    };
  },
);
