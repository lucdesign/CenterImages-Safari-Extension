/**
*    prejected.js
*    CenterImages Safari Extension
*    Version 5.0.4
*    © 2011 lucdesign
**/

function imageBamHack (e) {

  if (!e.onclick) {
    e.preventDefault();
  }
}

if (/imagebam/i.test(document.URL)) {
  var bamimage;
  document.addEventListener('beforeload', imageBamHack, true);
}