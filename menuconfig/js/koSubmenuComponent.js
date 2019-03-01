define(['knockout', 'koCustomComponents'], (ko) => {
  ko.components.register('kconfig-submenu', {
    viewModel: function submenuVM(params) {
      this.infoIcon = params.helpIcon;
      this.submenues = params.submenues;
    },
    template:
        `<!-- ko foreach: submenues -->
            <!-- ko if: $data.selectedType() === "choice" -->
            <kconfig-select params='options: $data.menuOptions, chosenValue: $data.chosenValue,
            isVisible: ($data.chosenValue() && $data.chosenValue().choiceValue),
            description: $data.title, name: $data.name, help: $data.help, helpIcon: $parent.infoIcon' >
            </kconfig-select>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "bool" -->
                <kconfig-checkbox params='isChecked: $data.chosenValue, description: $data.title,
                isVisible: ($data.chosenValue() != undefined && $data.title() != undefined),
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-checkbox>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "int" -->
                <kconfig-number params='chosenValue: $data.chosenValue, description: $data.title,
                isVisible: ($data.chosenValue() != undefined && $data.title() != undefined),
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-number>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "string" -->
                <kconfig-text params='chosenValue: $data.chosenValue,
                description: $data.title, isVisible: ($data.chosenValue() != undefined && $data.title() != undefined),
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-text>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "menu" -->
                <kconfig-menu params='chosenValue: $data.chosenValue, submenues: $data.submenues,
                title: $data.title, isVisible: ($data.title() != undefined), isCollapsed: $data.isCollapsed,
                name: $data.name, isMenuconfig: isMenuconfig, nameId: $data.nameId, isMenuVisible: $data.isMenuVisible,
                help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-menu>
            <!-- /ko -->
        <!-- /ko -->`,
  });
});
