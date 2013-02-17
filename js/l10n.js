/**
*    l10n.js
*    CenterImages Safari Extension
*    Version 6.0.2

*    © 2012 lucdesign
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
      help : 'Help'
    },
    // keys encode the tagName beginning from character 2
    instructions : [
    [ 'H1' , 'CenterImages wants to be used <br />with your mouse!'],
    [ 'H3' , 'Click and drag on the background:' ],
    [ 'P'  , 'up = brighter, down = darker' ],
    [ 'H3' , 'Click on the image:' ],
    [ 'P'  , 'original size / fit to window' ],
    [ 'H3' , 'Doubleclick beside the image:' ],
    [ 'P'  , 'Enhance Image Contrast (not available for SVG and ImageBam)' ]
    ],
    autocolor   : 'Automatic Background Color'
  },
  // German strings
  de : {
    bar : {
      equi : 'Kontrast verbessern',
      zoom : 'Größe anpassen',
      slbl : 'Hintergrund',
      albl : 'auto',
      help : 'Hilfe'
    },
    // keys encode the tagName beginning from character 2
    instructions : [
    [ 'H1' , 'CenterImages läßt sich <br />komplett mit der Maus bedienen!' ],
    [ 'H3' , 'Klicken und Ziehen auf dem Hintergrund:' ],
    [ 'P'  , 'hinauf = heller, hinunter = dunkler' ],
    [ 'H3' , 'Klick auf das Bild:' ],
    [ 'P'  , 'Originalgröße/Fenstergröße' ],
    [ 'H3' , 'Doppelklick neben dem Bild:' ],
    [ 'P'  , 'Bildverbesserung ein/aus (für SVG und ImageBam nicht verfügbar)' ]
    ],
    autocolor   : 'Hintergrundfarbe automatisch bestimmen'
  }
};

// set language
if (/^de/.test(navigator.language)) {
  strings = l10n.de; // German
} else {
  strings = l10n.en; // Revert to default (English)
}