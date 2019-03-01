define(['knockout', 'ParamsViewModel'], (ko, ParamsViewModel) => function MenuViewModel() {
  this.name = ko.observable();
  this.nameId = ko.observable();
  this.isCollapsed = ko.observable(false);
  this.sideNavIsCollapsed = ko.observable(false);
  this.parent_name = ko.observable();
  this.submenues = ko.observableArray();
  this.isMenuconfig = ko.observable(false);
  this.help = ko.observable();
  this.title = ko.observable();
  this.chosenValue = ko.observable();

  this.menuChildren = ko.pureComputed(() =>
    ko.utils.arrayFilter(this.submenues(), submenu => submenu.selectedType() === 'menu' &&
      submenu.isMenuVisible()).length);

  this.collapse = function collapse() {
    this.isCollapsed(!this.isCollapsed());
  };

  this.collapseSideNav = function collapseSideNav() {
    this.sideNavIsCollapsed(!this.sideNavIsCollapsed());
    console.log(this.sideNavIsCollapsed());
  };

  this.generate_menu_list = function generateMenuList(menuJson) {
    const menuList = ko.observableArray();

    Object.keys(menuJson).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(menuJson[key], 'children') && menuJson[key].children.length > 0) {
        const menu = new MenuViewModel();
        menu.title(menuJson[key].title);
        menu.nameId(menuJson[key].title.replace(/ /g, '').replace('++', ''));

        if (Object.prototype.hasOwnProperty.call(menuJson[key], 'is_menuconfig')) {
          menu.isMenuconfig(menuJson[key].is_menuconfig);
        }

        if (Object.prototype.hasOwnProperty.call(menuJson[key], 'help')) {
          menu.isMenuconfig(menuJson[key].help);
        }

        if (Object.prototype.hasOwnProperty.call(menuJson[key], 'name')) {
          menu.name(menuJson[key].name);
        }

        if (Object.prototype.hasOwnProperty.call(menuJson[key], 'children') && menuJson[key].children.length > 0) {
          Object.keys(menuJson[key].children).forEach((submenu) => {
            const item = menuJson[key].children[submenu];
            const paramVM = new ParamsViewModel();
            paramVM.setParameter(item);
            menu.submenues.push(paramVM);
          });
        }

        menuList.push(menu);
      }
    });

    return menuList;
  };

  this.setValue = function setValue(value) {
    this.chosenValue(value);
  };
});
