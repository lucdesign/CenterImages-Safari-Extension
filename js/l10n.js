/**
*    l10n.js
*    CenterImages Safari Extension
*    Version 4.0
*    © 2011 lucdesign
**/


// Global variables
var strings,
// English strings
l10n = {
  en : {
    bar : {
      equi : 'Enhance Contrast',
      zoom : 'Fit Screen',
      slbl : 'Background',                                                      
      albl : 'auto',         
      inst : 'Help'
    },
    // keys encode the tagName beginning from character 2
    instructions : [
    [ 'H1' , 'CenterImages wants to be used <br />with your mouse!'],
    [ 'H3' , 'Click and drag on the background:' ],
    [ 'P'  , 'up = brighter, down = darker' ], 
    [ 'H3' , 'Click on the image:' ],
    [ 'P'  , 'original size / fit to window' ],
    [ 'H3' , 'Doubleclick beside the image:' ],
    [ 'P'  , 'Enhance Image Contrast (not available for SVG)' ],
    [ 'HR' , null ],
    [ 'p'  , '<small><strong>HINT: </strong>Because of a known bug in Safari, extension bars will stop working after the forward or back buttons are pressed.<br />If this happens, the page needs to be roladed. Better yet, hide the bar (&times;) and use your mouse.</small>' ]
    ],
    contextmenu : 'Download Enhanced Image'
  },
  // German strings
  de : {
    bar : {
      equi : 'Kontrast verbessern',
      zoom : 'Größe anpassen',
      slbl : 'Hintergrund',         
      albl : 'auto',         
      inst : 'Hilfe'
    },                                           
    // keys encode the tagName beginning from character 2
    instructions : [
    [ 'H1' , 'CenterImages läßt sich <br />komplett mit der Maus bedienen!' ],
    [ 'H3' , 'Klicken und Ziehen auf dem Hintergrund:' ],
    [ 'P'  , 'hinauf = heller, hinunter = dunkler' ],
    [ 'H3' , 'Klick auf das Bild:' ],
    [ 'P'  , 'Originalgröße/Fenstergröße' ],
    [ 'H3' , 'Doppelklick neben dem Bild:' ], 
    [ 'P'  , 'Bildverbesserung ein/aus (für SVG nicht verfügbar)' ],
    [ 'HR' , null ],
    [ 'P'  , '<small><strong>HINWEIS:</strong> Aufgrund eines bekannten Fehlers in Safari hören Erweiterungs-Leisten auf zu funktionieren, wenn die Vor- oder Zurückfunktion des Browsers benutzt wurde. In diesem Fall bitte das Bild neu laden oder die Leiste verstecken und auf Mausbedienung umsteigen.</small>' ]
    ],
    contextmenu : 'Verbessertes Bild sichern'
  }
};

// set language
if (/^de/.test(navigator.language)) {
  strings = l10n.de; // German
} else {
  strings = l10n.en; // Revert to default (English)
}