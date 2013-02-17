/**
*    prejected.js
*    CenterImages Safari Extension
*    Version 6.0.2

*    © 2012 lucdesign
**/

/* global window */

// only used for imagebam to prevent scripts etc. from loading
if ( /^http:\/\/www\.imagebam\.com\/image/i.test(window.document.URL) ) {
  function imageBamHack (e) {
    if (e.target.onclick === null || !(e.target instanceof window.HTMLImageElement)) {
      e.preventDefault();
    }
  }
  window.document.addEventListener('beforeload', imageBamHack, false);
  window.document.addEventListener('load', function() { window.stop(); window.document.body.removeAttribute('onload'); }, false);
}