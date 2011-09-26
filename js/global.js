/**
 *    global.js
 *    CenterImages Safari Extension
 *    Version 4.0
 *    © 2011 lucdesign
 **/

/*global safari, strings */

var
  settings = safari.extension.settings,
  bars = safari.extension.bars,
  buttons = safari.extension.toolbarItems,
  app = safari.application,
  i, isActive = false;

// Setting up event listeners.
app.addEventListener('message', respond, false);
app.addEventListener('command', obey, false);
app.addEventListener('contextmenu', addContextMenuItem, false);
settings.addEventListener('change', settingsHaveChanged, false);

function toggleGui() {

  var i;

  for (i = 0; i < buttons.length; i++) {
    if (buttons[i].browserWindow === safari.application.activeBrowserWindow) {
        buttons[i].disabled = !isActive;
    }
  }
  if (settings.ShowBars) {
    for (i = 0; i < bars.length; i++) {
      if (bars[i].browserWindow === safari.application.activeBrowserWindow) {
        if (isActive) {
          bars[i].show();
        } else {
          bars[i].hide();
        }
      }
    }
  }
}

function notifyPage(name, message) {
  'use strict';
  safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(name, message);
}

function settingsHaveChanged(s) {
  'use strict';

  switch (s.key) {
  case 'ShowBars':
    toggleGui();
    break;
  case 'Zoom':
    notifyPage('Zoom', settings.Zoom);
    break;
  case 'Equalize':
    notifyPage('Equalize', settings.Equalize);
    break;
  case 'BGColor':
    notifyPage('bgCol', settings.BGColor);
    break;
  case 'Effect':
    notifyPage('Effect', settings.Effect);
    break;
  case 'AutoBGColor':
    notifyPage('AutoBGColor', settings.AutoBGColor);
    break;
  }
}

function serveSettings() {

  notifyPage('settings', {
    zoom: settings.Zoom,
    bcol: settings.BGColor,
    equi: settings.Equalize,
    efct: settings.Effect,
    auto: settings.AutoBGColor
  });
}

function respond(message) {

  var m = message.message;

  switch (message.name) {
  case 'restore':
    settings.Zoom = m.zoom;
    settings.Equalize = m.equa;
    settings.BgColor = m.bcol;
    isActive = true;
    toggleGui();
    break;
  case 'initialize':
    isActive = true;
    serveSettings();
    toggleGui();
    break;
  case 'zoom':
    settings.Zoom = m;
    break;
  case 'bgColor':
    settings.BgColor = m;
    settings.AutoBGColor = false;
    break;
  case 'equalized':
    settings.Equalize = m;
    break;
  case 'instructions':
    notifyPage('instructions', strings.instructions);
    break;
  case 'imagebamurl':
    notifyPage('ibu', m);
    break;
  case 'noImage':
    isActive = false;
    toggleGui();
    break;
  default:
    break;
  }
}

function obey(command) {
  'use strict';

  switch (command.command) {
  case 'equalize':
    settings.Equalize = !settings.Equalize;
    break;
  case 'downloadEQ':
    notifyPage('downloadEQ');
    break;
  case 'autocolor':
    settings.AutoBGColor = true;
    break;
  default:
    break;
  }
}

function addContextMenuItem(e) {
  'use strict';

  if (isActive) {
    e.contextMenu.appendContextMenuItem('autocolor', strings.autocolor);
    if (/canvas/i.test(e.userInfo)) {
      e.contextMenu.appendContextMenuItem('downloadEQ', strings.contextmenu);
    }
  }
}
