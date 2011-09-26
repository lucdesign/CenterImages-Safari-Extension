function imageBamHack (e) {

  if (!e.onclick) {
    e.preventDefault();
  }
}

if (/imagebam/i.test(document.URL)) {
  var bamimage;
  document.addEventListener('beforeload', imageBamHack, true);
}
