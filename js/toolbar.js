/**
*    toolbar.js
*    CenterImages Safari Extension
*    Version 5
*    © 2011 lucdesign
**/

/*global safari,settings, strings */


window.addEventListener('load', setupUi, false);

function setupUi() {

  var
  instWinVisible = false,
  settings = safari.extension.settings,
  ui = {
    zoom: document.getElementById('zoom'),
    equi: document.getElementById('equi'),
    inst: document.getElementById('inst'),
    bgsl: document.getElementById('bgsl'),
    slbl: document.getElementById('slbl'),
    auto: document.getElementById('auto'),
    albl: document.getElementById('albl'),
    copy: document.getElementById('copy'),
    hide: document.getElementById('hide')
  };

  function notifyPage(name, message) {
    safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(name, message);
  }

  function setBgColor() {
    settings.BGColor = ui.bgsl.value;
    settings.AutoBGColor = false;
  }

  function setAutoBgColor() {
    settings.AutoBGColor = ui.auto.checked;
  }

  function goLuc() {
    var newTab = safari.application.activeBrowserWindow.openTab();
    newTab.url = 'http://www.luc.at/safari_extensions/';
  }

  function handleClick(e) {
    if (!e.target.disabled) {
      switch (e.target) {
        case ui.zoom:
        settings.Zoom = !settings.Zoom;
        break;
        case ui.equi:
        settings.Equalize = !settings.Equalize;
        break;
        case ui.inst:
        instWinVisible = !instWinVisible;
        ui.inst.className = instWinVisible ? 'pressed' : null;
        notifyPage('toggle_instr', instWinVisible);
        break;
        case ui.copy:
        goLuc();
        break;
        case ui.hide:
        settings.ShowBars = false;
        break;
        default:
        break;
      }
    }
  }

  function settingsHaveChanged(s) {
    switch (s.key) {
      case 'Zoom':
      ui.zoom.className = settings.Zoom ? 'pressed' : null;
      break;
      case 'Equalize':
      ui.equi.className = settings.Equalize ? 'pressed' : null;
      break;
      case 'AutoBGColor':
      ui.auto.checked = settings.AutoBGColor;
      break;
    }
  }

  function handleMessage(message) {
    // message.target.page.dispatchMessage
    var m = message.message;

    if (message.target === safari.application.activeBrowserWindow.activeTab) {
      switch (message.name) {
        case 'restore':
        ui.zoom.className = m.zoom ? 'pressed' : null;
        ui.equi.disabled = m.good ? 'disabled' : null;
        ui.bgsl.value = m.bcol;
        ui.inst.className = m.inst ? 'pressed' : null;
        ui.zoom.disabled = ui.slbl.className = ui.bgsl.disabled = ui.auto.disabled = ui.albl.className = ui.inst.disabled = null;
        break;
        case 'initialize':
        ui.zoom.disabled = ui.slbl.className = ui.bgsl.disabled = ui.auto.disabled = ui.albl.className = ui.inst.disabled = null;
        break;
        case 'bgColor':
        ui.bgsl.value = m;
        break;
        case 'inst':
        instWinVisible = m;
        ui.inst.className = instWinVisible ? 'pressed' : null;
        break;
        case 'GoodImage':
        ui.equi.disabled = m ? 'disabled' : null;
        break;
        default:
        break;
      }
    }
  }

  ui.zoom.innerHTML = strings.bar.zoom;
  ui.zoom.className = settings.zoom ? 'pressed' : null;
  ui.equi.innerHTML = strings.bar.equi;
  ui.equi.className = settings.Equalize ? 'pressed' : null;
  ui.bgsl.value = settings.BGColor;
  ui.slbl.textContent = strings.bar.slbl;
  ui.auto.checked = settings.AutoBGColor;
  ui.albl.textContent = strings.bar.albl;
  ui.inst.innerHTML = strings.bar.inst;
  ui.inst.className = instWinVisible ? 'pressed' : null;

  document.addEventListener('click', handleClick, false);
  ui.bgsl.addEventListener('change', setBgColor, false);
  ui.auto.addEventListener('change', setAutoBgColor, false);
  settings.addEventListener('change', settingsHaveChanged, false);
  safari.application.addEventListener('message', handleMessage, false);
}