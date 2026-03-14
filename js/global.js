/**
 *  global.js (background script)
 *  CenterImages Safari Extension — Version 7.0.0
 *  © 2026 lucdesign
 **/

var STORAGE_KEYS = ['Zoom', 'AutoBgColor', 'BgColor', 'Equalize', 'Effect'];
var DEFAULTS = { Zoom: false, AutoBgColor: false, BgColor: 128, Equalize: false, Effect: 'none' };
var RELAY_TO_POPUP  = ['tabSettings', 'noCI', 'RGB', 'blur', 'dull'];
var FORWARD_TO_TAB  = ['Zoom', 'AutoBgColor', 'BgColor', 'Equalize', 'Effect', 'popup_help'];

// port from content script
var ciPort = null;

browser.runtime.onConnect.addListener(function(port) {
  if (port.name === 'ci-content') {
    ciPort = port;
    port.onDisconnect.addListener(function() { ciPort = null; });
  }
});

browser.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  var name    = msg.name;
  var message = msg.message;
  if (name === 'getSettings') {
    browser.storage.local.get(STORAGE_KEYS, function(stored) {
      sendResponse(Object.assign({}, DEFAULTS, stored));
    });
    return true;
  }

  if (name === 'helpWindow') {
    if (ciPort) ciPort.postMessage({ name: 'instructions', message: strings.instructions });
    return;
  }

  // popup → forward to content script via port (only from popup, not from content script)
  if (FORWARD_TO_TAB.indexOf(name) !== -1 && !(sender && sender.tab)) {
    if (ciPort) ciPort.postMessage({ name: name, message: message });
    if (name !== 'popup_help') {
      var update = {}; update[name] = message;
      browser.storage.local.set(update);
    }
    return;
  }

  // relay state from content script to popup
  if (RELAY_TO_POPUP.indexOf(name) !== -1) {
    browser.runtime.sendMessage(msg).catch(function() {});
    return;
  }
});
