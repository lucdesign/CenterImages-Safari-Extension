/**
*    global.js
*    CenterImages Safari Extension
*    Version 5.0.4
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
  for (i = 0; i < bars.length; i++) {
    if (settings.ShowBars && bars[i].browserWindow === safari.application.activeBrowserWindow) {
      if (isActive) {
        bars[i].show();
      }
    } else {
      bars[i].hide();
    }
  }
}

function notify(requesting, name, message) {
  'use strict';
  requesting.page.dispatchMessage(name, message);
}

function settingsHaveChanged(s) {
  'use strict';

  var frontmost = safari.application.activeBrowserWindow.activeTab;

  switch (s.key) {
    case 'ShowBars':
    toggleGui();
    break;
    case 'Zoom':
    notify(frontmost, 'Zoom', settings.Zoom);
    break;
    case 'Equalize':
    notify(frontmost, 'Equalize', settings.Equalize);
    break;
    case 'BGColor':
    notify(frontmost, 'bgCol', settings.BGColor);
    break;
    case 'Effect':
    notify(frontmost, 'Effect', settings.Effect);
    break;
    case 'AutoBGColor':
    notify(frontmost, 'AutoBGColor', settings.AutoBGColor);
    break;
  }
}

function serveSettings(calling_page) {

  notify(
  calling_page, 'settings', {
    zoom: settings.Zoom,
    bcol: settings.BGColor,
    equi: settings.Equalize,
    efct: settings.Effect,
    auto: settings.AutoBGColor
  });
}

function respond(message) {

  var m = message.message, caller = message.target;

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
    serveSettings(caller);
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
    notify(caller, 'instructions', strings.instructions);
    break;
    case 'imagebamurl':
    notify(caller, 'ibu', m);
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
    notify(safari.application.activeBrowserWindow.activeTab, 'downloadEQ');
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