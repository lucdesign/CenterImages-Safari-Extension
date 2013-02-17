/**
*    toolbar.js
*    CenterImages Safari Extension
*    Version 6.0.2

*    © 2012 lucdesign
**/

/*global window, document, safari, setupUi, strings */

window.addEventListener('load', setupUi, false);

function setupUi() {

  var
  disabled = false,
  helpWinVisible = false,
  globalSettings = safari.extension.settings,
  windowSettings = clone(globalSettings),
  ui = {
    zoom : document.getElementById('zoom'),
    equi : document.getElementById('equi'),
    help : document.getElementById('help'),
    bgsl : document.getElementById('bgsl'),
    slbl : document.getElementById('slbl'),
    auto : document.getElementById('auto'),
    albl : document.getElementById('albl'),
    copy : document.getElementById('copy'),
    hide : document.getElementById('hide'),
    active : true
  };


  (function(){
    if (document.createElement('a').classList === undefined) {
      /*
      * classList.js: element.classList implementation.
      * By Eli Grey, http://eligrey.com
      * Grossly simplified by lucdesign (http://www.luc.at) for inclusion here in 2012
      *
      * Public Domain.
      * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
      */
      /*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
      var
      checkTokenAndGetIndex = function (classList, token) { return classList.indexOf(token); },
      ClassList = function (elem) {
        var
        trimmedClasses = elem.className.trim(),
        classes = trimmedClasses ? trimmedClasses.split(/\s+/) : [],
        i = 0,
        len = classes.length;
        for (; i < len; i++) {
          this.push(classes[i]);
        }
        this.updateClassName = function () {
          elem.className = this.toString();
        };
      },
      classListGetter = function () { return new ClassList(this); };

      ClassList.prototype.contains = function (token) { return checkTokenAndGetIndex(this, token) !== -1; };
      ClassList.prototype.add = function (token) {
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.push(token);
          this.updateClassName();
        }
      };
      ClassList.prototype.remove = function (token) {
        var index = checkTokenAndGetIndex(this, token);
        if (index !== - 1) {
          this.splice(index, 1);
          this.updateClassName();
        }
      };
      ClassList.prototype.toggle = function (token) {
        if (checkTokenAndGetIndex(this, token) === - 1) {
          this.add(token);
        } else {
          this.remove(token);
        }
      };
      ClassList.prototype.toString = function () { return this.join(' '); };

      Object.defineProperty(window.HTMLElement.prototype, 'classList', { get: classListGetter, enumerable: true, configurable: true });
    }
  }
  ());

  // copy settings object
  function clone(obj) {
      var ClonedObject = function(){};
      ClonedObject.prototype = obj;
      return new ClonedObject();
  }

  // setting classes of document.body depending on a condition
  function setClass(cls, condition) {
    if (condition === true) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
  }

  // react to narrow window, set narrow class on body
  function showHideExtras() {
    setClass('narrow', window.innerWidth < 1027);
  }

  // communication with the page
  function tellActiveTab(name, message) {
    safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(name, message);
  }

  // the background slider has been moved
  function setBgColor() {
    windowSettings.BgColor = ui.bgsl.value;
    windowSettings.AutoBgColor = false;
    globalSettings.AutoBgColor = false;
    tellActiveTab('AutoBgColor', windowSettings.AutoBgColor);
    tellActiveTab('BgColor', windowSettings.BgColor);
  }

  // the auto background color checkmark has been clicked
  function setAutoBgColor() {
    windowSettings.AutoBgColor = ui.auto.checked;
    tellActiveTab('AutoBgColor', windowSettings.AutoBgColor);
  }

  // user clicked on the copyright notice, go to www.luc.at
  function goLuc() {
    var newTab = safari.application.activeBrowserWindow.openTab();
    newTab.url = 'http://www.luc.at/safari_extensions/';
  }

  // all extension bar click events get dispatched here
  function handleClick(e) {
    if ( (!disabled && !e.target.disabled) || e.target === ui.hide) {
      switch (e.target) {
        case ui.zoom:
        windowSettings.Zoom = !windowSettings.Zoom;
        tellActiveTab('Zoom', windowSettings.Zoom);
        break;
        case ui.equi:
        windowSettings.Equalize = !windowSettings.Equalize;
        tellActiveTab('Equalize', windowSettings.Equalize);
        ui.equi.className = windowSettings.Equalize ? 'pressed' : null;
        break;
        case ui.help:
        helpWinVisible = !helpWinVisible;
        ui.help.className = helpWinVisible ? 'pressed' : null;
        tellActiveTab('popup_help', helpWinVisible);
        break;
        case ui.copy:
        goLuc();
        break;
        case ui.hide:
        safari.self.hide();
        break;
        default:
        break;
      }
    }
    safari.application.activeBrowserWindow.activeTab.activate();
  }

  // all messages from the page get managed here
  function handleMessage(message) {
    // message.target.page.dispatchMessage
    var
    m = message.message,
    t = message.target;
    
    if (t.browserWindow === safari.self.browserWindow && t === safari.self.browserWindow.activeTab) {
      switch (message.name) {
        case 'tabSettings':
        disabled = false;
        windowSettings.Zoom = m.zoom;
        ui.zoom.className = m.zoom ? 'pressed' : null;
        windowSettings.Equalize = m.equi;
        ui.equi.disabled = m.dull ? null : 'disabled';
        ui.equi.className = m.equi ? 'pressed' : null;
        windowSettings.BgColor = m.bcol;
        windowSettings.AutoBgColor = m.auto;
        ui.bgsl.value = m.bcol;
        ui.auto.disabled = m.RGB ? null : 'disabled';
        ui.albl.className = m.RGB ? null : 'disabled';
        ui.auto.checked = m.auto ? 'checked' : null;
        helpWinVisible = m.help;
        ui.help.className = m.help ? 'pressed' : null;
        document.body.classList.remove('disabled');
        document.body.classList.remove('blur');
        break;
        case 'AutoBgColor' :
        windowSettings.AutoBgColor = m;
        ui.auto.checked = m ? 'checked' : null;
        break;
        case 'BgColor':
        windowSettings.BgColor = m;
        ui.bgsl.value = windowSettings.BgColor = m;
        break;
        case 'Zoom':
        windowSettings.Zoom = m;
        ui.zoom.className = m ? 'pressed' : null;
        break;
        case 'Equalize':
        windowSettings.Equalize = m;
        ui.equi.className = m ? 'pressed' : null;
        break;
        case 'help':
        helpWinVisible = m;
        ui.help.className = helpWinVisible ? 'pressed' : null;
        break;
        case 'dull':
        ui.equi.disabled = m ? null : 'disabled';
        break;
        case 'noCI' :
        disabled = true;
        ui.auto.disabled = 'disabled';
        document.body.classList.add('disabled');
        document.body.classList.remove('blur');
        break;
        case 'RGB' :
        ui.auto.disabled = m ? null : 'disabled';
        ui.albl.className = m ? null : 'disabled';
        break;
        case 'blur' :
        if (message.target === safari.self.browserWindow.activeTab) {
          document.body.classList.add('blur');
        }
        break;
        default:
        break;
      }
    }
  }

  // just for cleanliness
  (function(){
    showHideExtras();

    ui.zoom.innerHTML = strings.bar.zoom;
    ui.zoom.className = windowSettings.zoom ? 'pressed' : null;
    ui.equi.innerHTML = strings.bar.equi;
    ui.equi.className = windowSettings.Equalize ? 'pressed' : null;
    ui.bgsl.value = windowSettings.BgColor;
    ui.slbl.textContent = strings.bar.slbl;
    ui.auto.checked = windowSettings.AutoBgColor;
    ui.albl.textContent = strings.bar.albl;
    ui.help.innerHTML = strings.bar.help;
    ui.help.className = helpWinVisible ? 'pressed' : null;

    window.addEventListener('focus', function(){ ui.active = true ; document.body.classList.add('active');}, false);
    window.addEventListener('blur' , function(e) { ui.active = false; document.body.classList.remove('active'); }, false);

    document.addEventListener('click', handleClick, false);
    ui.bgsl.addEventListener('change', setBgColor, false);
    ui.auto.addEventListener('change', setAutoBgColor, false);
    safari.application.addEventListener('message', handleMessage, false);
    window.addEventListener('resize', showHideExtras, false);
  }
  ());
}