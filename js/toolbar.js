/**
 *  toolbar.js
 *  CenterImages Safari Extension — Version 7.0.0
 *  © 2026 lucdesign
 **/

/*global window, document, browser, strings */

window.addEventListener('load', function() {

  var
  disabled = false,
  helpWinVisible = false,
  settings = {},
  ui = {
    zoom : document.getElementById('zoom'),
    equi : document.getElementById('equi'),
    help : document.getElementById('help'),
    bgsl : document.getElementById('bgsl'),
    slbl : document.getElementById('slbl'),
    auto : document.getElementById('auto'),
    albl : document.getElementById('albl'),
    copy : document.getElementById('copy'),
    hide : document.getElementById('hide')
  };

  // send via background (tabs.sendMessage is broken in Safari popups)
  function tellActiveTab(name, message) {
    browser.runtime.sendMessage({ name: name, message: message }, function() {});
  }

  // apply a settings object to the UI
  function applySettings(s) {
    ui.zoom.className     = s.Zoom      ? 'pressed' : null;
    ui.equi.className     = s.Equalize  ? 'pressed' : null;
    ui.bgsl.value         = s.BgColor !== undefined ? s.BgColor : 128;
    ui.auto.checked       = s.AutoBgColor ? 'checked' : null;
  }


  // background slider moved
  function setBgColor() {
    settings.BgColor = parseInt(ui.bgsl.value, 10);
    settings.AutoBgColor = false;
    ui.auto.checked = null;
    tellActiveTab('AutoBgColor', false);
    tellActiveTab('BgColor', settings.BgColor);
  }

  // auto color checkbox clicked
  function setAutoBgColor() {
    settings.AutoBgColor = ui.auto.checked;
    tellActiveTab('AutoBgColor', settings.AutoBgColor);
  }

  // button clicks
  function handleClick(e) {
    if ((!disabled && !e.target.disabled) || e.target === ui.hide) {
      switch (e.target) {
        case ui.zoom:
          settings.Zoom = !settings.Zoom;
          tellActiveTab('Zoom', settings.Zoom);
          break;
        case ui.equi:
          settings.Equalize = !settings.Equalize;
          tellActiveTab('Equalize', settings.Equalize);
          ui.equi.className = settings.Equalize ? 'pressed' : null;
          break;
        case ui.help:
          helpWinVisible = !helpWinVisible;
          ui.help.className = helpWinVisible ? 'pressed' : null;
          tellActiveTab('popup_help', helpWinVisible);
          break;
        case ui.copy:
          browser.tabs.create({ url: 'https://luc.at' });
          break;
        case ui.hide:
          window.close();
          break;
      }
    }
  }


  // messages relayed from content script via background
  function handleMessage(msg) {
    var m = msg.message, n = msg.name;
    switch (n) {
      case 'tabSettings':
        disabled = false;
        ui.equi.disabled   = m.dull ? null : 'disabled';
        ui.auto.disabled   = m.RGB  ? null : 'disabled';
        ui.albl.className  = m.RGB  ? null : 'disabled';
        helpWinVisible     = m.help;
        ui.help.className  = m.help ? 'pressed' : null;
        document.body.classList.remove('disabled');
        document.body.classList.remove('blur');
        break;
      case 'noCI':
        disabled = true;
        ui.auto.disabled = 'disabled';
        document.body.classList.add('disabled');
        document.body.classList.remove('blur');
        break;
      case 'dull':
        ui.equi.disabled = m ? null : 'disabled';
        break;
      case 'RGB':
        ui.auto.disabled  = m ? null : 'disabled';
        ui.albl.className = m ? null : 'disabled';
        break;
      case 'blur':
        document.body.classList.add('blur');
        break;
    }
  }

  // init
  ui.zoom.innerHTML    = strings.bar.zoom;
  ui.equi.innerHTML    = strings.bar.equi;
  ui.slbl.textContent  = strings.bar.slbl;
  ui.albl.textContent  = strings.bar.albl;
  ui.help.innerHTML    = strings.bar.help;

  // load persisted settings
  browser.runtime.sendMessage({ name: 'getSettings' }, function(s) {
    if (s) { Object.assign(settings, s); applySettings(s); }
  });

  // sync UI live when content script changes settings via storage
  browser.storage.onChanged.addListener(function(changes) {
    var updated = {};
    if (changes.BgColor)     { updated.BgColor     = changes.BgColor.newValue; }
    if (changes.AutoBgColor) { updated.AutoBgColor  = changes.AutoBgColor.newValue; }
    if (changes.Zoom)        { updated.Zoom         = changes.Zoom.newValue; }
    if (changes.Equalize)    { updated.Equalize     = changes.Equalize.newValue; }
    if (Object.keys(updated).length) {
      Object.assign(settings, updated);
      applySettings(settings);
    }
  });

  // relay from background
  browser.runtime.onMessage.addListener(handleMessage);

  document.addEventListener('click', handleClick, false);
  ui.bgsl.addEventListener('change', setBgColor, false);
  ui.bgsl.addEventListener('input', setBgColor, false);
  ui.auto.addEventListener('change', setAutoBgColor, false);

}, false);
