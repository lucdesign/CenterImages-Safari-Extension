/**
*    global.js
*    CenterImages Safari Extension
*    Version 6.0.2

*    © 2012 lucdesign
**/

/*global window, document, safari, strings */
(function(window) {
  var
  ext = safari.extension,
  settings = ext.settings,
  app = safari.application,
  ciTabInForeground = false,
  isRGB = false;

  // Setting up event listeners.
  app.addEventListener('message', respondToMessage, false);
  app.addEventListener('command', respondToContextMenu, false);
  app.addEventListener('contextmenu', addContextMenuItem, false);
  // settings.addEventListener('change', settingsHaveChanged, false);
  // app.activeBrowserWindow.activeTab.addEventListener('activate', function() { notify( app.activeBrowserWindow.activeTab, 'event', 'activate');});

  // shim (adds .classList to safari 5 and below)
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

  function notify(caller, name, message) {
    'use strict';
    caller.dispatchMessage(name, message);
  }

  function serveSettings(caller) {

    notify(
    caller,
    'initialize', {
      zoom: settings.Zoom,
      auto: settings.AutoBgColor,
      bcol: settings.BgColor,
      equi: settings.Equalize,
      efct: settings.Effect
    });
  }

  function respondToMessage(e) {

    var
    m = e.message,
    n = e.name,
    p = e.target.page;
    switch (n) {
      case 'tabSettings' :
      isRGB = m.RGB;
      break;
      case 'noCI' : ciTabInForeground = false; break;
      case 'RGB' : isRGB = m; break;
      case 'blur' : break;
      case 'dull' : break;
      case 'restore': break;
      case 'sendStandardSettings': serveSettings(p); break;
      case 'helpWindow': notify(p, 'instructions', strings.instructions); break;
      case 'imagebamurl': notify(p, 'ibu', m); break;
      default: ciTabInForeground = true; settings[n] = m; break;
    }
  }

  function respondToContextMenu(e) {
    'use strict';

    switch (e.command) {
      case 'downloadEQ':
      notify(app.activeBrowserWindow.activeTab.page, 'downloadEQ');
      break;
      case 'autocolor':
      notify(app.activeBrowserWindow.activeTab.page, 'AutoBgColor', true);
      settings.AutoBgColor = true;
      break;
      default:
      break;
    }
  }

  function addContextMenuItem(e) {
    'use strict';

    if (ciTabInForeground) {
      if (!settings.AutoBgColor && isRGB) {
        e.contextMenu.appendContextMenuItem('autocolor', strings.autocolor);
      }
    }
  }
}
(window));