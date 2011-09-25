/**
*    global.js
*    CenterImages Safari Extension
*    Version 4.0
*    © 2011 lucdesign
**/

var
settings = safari.extension.settings,
bars = safari.extension.bars,
app = safari.application,
i;

// Setting up event listeners.
app.addEventListener('message', respond, false);
app.addEventListener('command', obey, false);
app.addEventListener('contextmenu', addContextMenuItem, false);
settings.addEventListener ('change', settingsHaveChanged, false);

function notifyPage ( name, message ) {
  safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(name, message);
}

function settingsHaveChanged ( s ) {
  switch (s.key) {
    case 'ShowBars' :
    if (settings.ShowBars) {
      bars[0].show();
    } else {
      bars[0].hide();
    }
    break;
    case 'Zoom' :
    notifyPage('Zoom', settings.Zoom);
    break;
    case 'Equalize' :
    notifyPage('Equalize', settings.Equalize);
    break;
    case 'BGColor' :
    notifyPage('bgCol', settings.BGColor);
    break;
    case 'Effect' :
    notifyPage('Effect', settings.Effect);
    break;
    case 'AutoBGColor' :
    notifyPage('AutoBGColor', settings.AutoBGColor);
    break;
  }
}

function serveSettings ( ) {
  notifyPage( 'settings', {
    zoom : settings.Zoom,
    bcol : settings.BGColor,
    equi : settings.Equalize,
    efct : settings.Effect,
    auto : settings.AutoBGColor
  });
}

function respond ( message ) {
  var m = message.message;
  switch (message.name) {
    case 'settings'      : serveSettings(); break;
    case 'localSettings' : settings.Zoom = m.zoom; settings.Equalize = m.equa; settings.BgColor = m.bcol; break;
    case 'zoom'          : settings.Zoom = m; break;
    case 'bgColor'       : settings.BgColor = m; settings.AutoBGColor = false; break;
    case 'equalized'     : settings.Equalize = m; break;
    case 'instructions'  : notifyPage('instructions', strings.instructions); break;
    case 'imagebamurl'   : nofifyPage('ibu', m); break; 
    default              : break;
  }
}

function obey ( command ) {
  switch (command.command) {
    case 'equalize'   : settings.Equalize = !settings.Equalize; break;
    case 'downloadEQ' : notifyPage('downloadEQ'); break;
    case 'autocolor'  : settings.AutoBGColor = true; break;
    default           : break;
  }
}

function addContextMenuItem ( e ) {
  e.contextMenu.appendContextMenuItem('autocolor', strings.autocolor);
  if (/canvas/i.test(e.userInfo)) {
    e.contextMenu.appendContextMenuItem('downloadEQ', strings.contextmenu);
  }
}