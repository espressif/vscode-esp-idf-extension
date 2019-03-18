define(['knockout', 'HtmlFormatter'], (ko, HtmlFormatter) => function ParamViewModel() {
  this.id = '';
  this.name = ko.observable();
  this.nameId = ko.observable();
  this.help = ko.observable('');
  this.isCollapsed = ko.observable(false);
  this.type = ko.observableArray(['choice', 'bool', 'int', 'string', 'menu']);
  this.selectedType = ko.observable();
  this.menuOptions = ko.observableArray();
  this.chosenValue = ko.observable();
  this.title = ko.observable('');
  this.minValue = ko.observable(-999999);
  this.maxValue = ko.observable(999999);
  this.submenues = ko.observableArray();
  this.dependencies = ko.observable('');
  this.isMenuconfig = ko.observable(false);
  this.isVisible = ko.observable();

  this.isMenuVisible = ko.pureComputed(() => {
    const childrenLength = ko.utils.arrayFilter(this.submenues(), submenu =>
      submenu.chosenValue() !== undefined && submenu.chosenValue() !== null &&
        submenu.title() !== null && submenu.title() !== undefined).length;
    return ((this.isMenuconfig() && (this.chosenValue() !== undefined)
      && (this.chosenValue() !== null)) || (childrenLength > 0));
  });

  const ChoiceOption = function choiceOption(id, name, title, value, visibility) {
    this.id = id;
    this.choiceName = name;
    this.choiceTitle = title;
    this.choiceValue = value;
    this.choiceVisibility = visibility;
  };

  this.collapse = function collapse() {
    this.isCollapsed(!this.isCollapsed());
  };

  this.search = function search(value) {
    const results = ko.observableArray();
    if (this.name() !== undefined && this.name() !== null
    && this.name().toLowerCase().indexOf(value.toLowerCase()) >= 0) {
      results.push(this);
    } else if (this.title() !== undefined && this.title() !== null &&
    this.title().toLowerCase().indexOf(value.toLowerCase()) >= 0) {
      results.push(this);
    } else {
      ko.utils.arrayForEach(this.submenues(), (submenu) => {
        const subResults = submenu.search(value);
        ko.utils.arrayForEach(subResults(), (subSubMenu) => {
          results.push(subSubMenu);
        });
      });
    }
    return results;
  };

  this.mapDictionaryToArray = function mapDictionaryToArray(dictionary) {
    const result = ko.observableArray();
    Object.keys(dictionary).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
        const choiceOpt = new ChoiceOption(
          dictionary[key].id,
          dictionary[key].name,
          dictionary[key].title,
          undefined,
          false,
        );
        result.push(choiceOpt);
      }
    });
    return result;
  };

  this.setParameter = function setParameter(item) {
    if (Object.prototype.hasOwnProperty.call(item, 'name') && item.name !== null) {
      this.name(item.name);
      this.nameId(item.name.replace(/ /g, '').replace('++', ''));
    } else {
      this.nameId(item.title.replace(/ /g, '').replace('++', ''));
    }
    this.id = item.id;

    this.dependencies = item.depends_on;
    this.title(item.title);
    const formatter = new HtmlFormatter();
    const newHelp = formatter.formatHelpText(item.help);

    this.help(newHelp);

    if (item.title === '') {
      this.title(item.name);
    }

    if (item.type === 'hex') {
      this.selectedType('string');
    } else {
      this.selectedType(item.type);
    }

    if (Object.prototype.hasOwnProperty.call(item, 'is_menuconfig')) {
      this.isMenuconfig(item.is_menuconfig);
    }

    // let choiceOpts;
    if (item.type === 'choice' && item.children && item.children.length > 0) {
      const choiceOpts = this.mapDictionaryToArray(item.children);
      this.menuOptions(choiceOpts());
      // this.menuOptions = this.mapDictionaryToArray(item.children);
      if (this.chosenValue() === undefined) {
        const emptyOption = new ChoiceOption(
          0,
          null,
          null,
          null,
          false,
        );
        this.chosenValue(emptyOption);
      }
    }

    if (item.type !== 'choice' && item.children && item.children.length > 0) {
      Object.keys(item.children).forEach((key) => {
        const submenu = new ParamViewModel();
        submenu.setParameter(item.children[key]);
        this.submenues.push(submenu);
      });
    }

    if (item.type === 'int' && item.range !== null && item.range.length > 0) {
      this.maxValue(item.range[1]);
      this.minValue(item.range[0]);
    }
  };

  this.setValues = function setValues(newValues) {
    if (this.name() in newValues.values && this.selectedType() !== 'choice') {
      this.chosenValue(newValues.values[this.name()]);
    }
    if (this.id in newValues.visible) {
      this.isVisible(newValues.visible[this.id]);
    }
    if (this.selectedType() === 'choice') {
      ko.utils.arrayForEach(this.menuOptions(), (option) => {
        if (option.choiceName in newValues.values) {
          const optionVisibility = option.choiceName in newValues.visible ?
            newValues.visible[option.choiceName] : option.optionVisibility;
          const newOption = new ChoiceOption(
            option.id,
            option.choiceName,
            option.choiceTitle,
            newValues.values[option.choiceName],
            optionVisibility,
          );
          this.menuOptions.replace(option, newOption);
          if (newOption.choiceValue !== false) {
            this.chosenValue(newOption);
          }
        }
      });
    }
    if (this.name() in newValues.ranges) {
      if (newValues.ranges[this.name()] !== null && newValues.ranges[this.name()].length > 0) {
        this.maxValue(newValues.ranges[this.name()][1]);
        this.minValue(newValues.ranges[this.name()][0]);
      } else {
        this.maxValue(999999);
        this.minValue(-999999);
      }
    }
    ko.utils.arrayForEach(this.submenues(), (submenu) => {
      submenu.setValues(newValues);
    });
  };
});
