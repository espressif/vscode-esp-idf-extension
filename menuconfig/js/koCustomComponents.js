define(['knockout', 'koSubmenuComponent'], (ko) => {
  ko.components.register('kconfig-select', {
    viewModel: function selectVM(params) {
      this.menuOptions = params.options;
      this.selectedValue = params.chosenValue;
      this.description = params.description;
      this.isVisible = params.isVisible;
      this.name = params.name;
      this.help = params.help;
      this.helpIcon = params.helpIcon;
      this.isHelpVisible = ko.observable(false);
      this.toggleHelp = function toggleHelp() {
        this.isHelpVisible(!this.isHelpVisible());
      };
    },
    template:
        `<div class="form-group" data-bind="visible: isVisible">
            <label data-bind="text: description" style="display: inline-block;"> </label>
            <img src='./assets/info.png' class="info-collapse" data-bind="click: toggleHelp, attr: { src: helpIcon }">
            <br>
            <select class="form-control" data-bind="options: menuOptions, value: selectedValue,
                optionsText: 'choiceTitle',
                event: { change: $root.updateSelectConf}" style="display: inline-block;"></select>
            <div class="content" data-bind="visible: isHelpVisible">
              <p data-bind="html: help"></p>
            </div>
        </div>`,
  });

  ko.components.register('kconfig-checkbox', {
    viewModel: function checkboxVM(params) {
      this.isChecked = params.isChecked;
      this.description = params.description;
      this.isVisible = params.isVisible;
      this.name = params.name;
      this.help = params.help;
      this.helpIcon = params.helpIcon;
      this.submenues = params.submenues;
      this.isHelpVisible = ko.observable(false);
      this.toggleHelp = function toggleHelp() {
        this.isHelpVisible(!this.isHelpVisible());
      };
    },
    template:
            `<div class="form-group" data-bind="visible: isVisible">
              <div class="switch_box">
                <input id="${this.name}" type="checkbox" data-bind="checked: isChecked, event: { change: $root.updateConf}" class="switch_1">
                <label for="${this.name}" data-bind="text: description" style="display: block;"></label>
                <img src='./assets/info.png' class="info-collapse" data-bind="click: toggleHelp, attr: { src: helpIcon }">
                <br> <br>
              </div>
              <div class="content" data-bind="visible: isHelpVisible">
                <p data-bind="html: help"></p>
              </div>
            </div>`,
  });

  ko.components.register('kconfig-number', {
    viewModel: function numberVM(params) {
      this.chosenValue = params.chosenValue;
      this.description = params.description;
      this.isVisible = params.isVisible;
      this.name = params.name;
      this.help = params.help;
      this.helpIcon = params.helpIcon;
      this.submenues = params.submenues;
      this.isHelpVisible = ko.observable(false);
      this.toggleHelp = function toggleHelp() {
        this.isHelpVisible(!this.isHelpVisible());
      };
    },
    template:
            `<div class="form-group" data-bind="visible: isVisible">
                <label data-bind="text: description()" style="display: inline-block;"> </label> 
                <img src='./assets/info.png' class="info-collapse" data-bind="click: toggleHelp, attr: { src: helpIcon }">
                <br>
                <input type="number" class="form-control" placeholder="0" 
                  data-bind="textInput: chosenValue, event: { change: $root.updateConf}" style="display: inline-block;">
                <div class="content" data-bind="visible: isHelpVisible">
                  <p data-bind="html: help"></p>
                </div>
            </div>`,
  });

  ko.components.register('kconfig-text', {
    viewModel: function textVM(params) {
      this.chosenValue = params.chosenValue;
      this.isText = true;
      this.description = params.description;
      this.isVisible = params.isVisible;
      this.name = params.name;
      this.help = params.help;
      this.helpIcon = params.helpIcon;
      this.isHelpVisible = ko.observable(false);
      this.submenues = params.submenues;
      this.toggleHelp = function toggleHelp() {
        this.isHelpVisible(!this.isHelpVisible());
      };
    },
    template:
            `<div class="form-group" data-bind="visible: isVisible">
                <label data-bind="text: description()" style="display: inline-block;"> </label> 
                <img src='./assets/info.png' class="info-collapse" data-bind="click: toggleHelp, attr: { src: helpIcon }">
                <br>
                <input type="text" class="form-control" 
                  data-bind="textInput: chosenValue, event: { change: $root.updateConf}" style="display: inline-block;">
                <div class="content" data-bind="visible: isHelpVisible">
                  <p data-bind="html: help"></p>
                </div>
            </div>`,
  });

  ko.components.register('kconfig-menu', {
    viewModel: function menuVM(params) {
      this.name = params.name;
      this.nameId = params.nameId;
      this.helpIcon = params.helpIcon;
      this.chosenValue = params.chosenValue;
      this.title = params.title;
      this.isVisible = params.isVisible;
      this.help = params.help;
      this.isMenuconfig = params.isMenuconfig;
      this.isHelpVisible = ko.observable(false);
      this.isCollapsed = params.isCollapsed;
      this.submenues = params.submenues;
      this.toggleHelp = function toggleHelp() {
        this.isHelpVisible(!this.isHelpVisible());
      };
      this.collapse = function collapse() {
        this.isCollapsed(!this.isCollapsed());
      };
      this.isMenuVisible = params.isMenuVisible;
    },
    template:
            `<div class="submenu" data-bind="attr: { id : nameId }, css: {'openedSection': isCollapsed() }, 
              visible: isVisible">
                  <h3 data-bind="text: $data.title, click: collapse"></h3>
                  <!-- ko if: isMenuconfig() -->
                    <kconfig-checkbox params='isChecked: chosenValue,
                      description: $data.title,
                      isVisible: $data.isVisible,
                      name: name, help: help, helpIcon: helpIcon, css : { 'menuconfig': is_menuconfig()}'>
                    </kconfig-checkbox>
                  <!-- /ko -->
                  <kconfig-submenu params='submenues: $data.submenues, helpIcon: helpIcon'>
                  </kconfig-submenu>
              </div>`,
  });
});
