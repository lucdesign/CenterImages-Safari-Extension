/**
*    injected.js
*
*    CenterImages Safari Extension
*    Version 5.0
*    © 2011 lucdesign
**/

// self-executing anonymous function for scope
(function () {


  // helper
  function hide (el) {
    el.classList.add('hide');
  }
  // end 'hide'

  // helper
  function show (el) {
    el.classList.remove('hide');
  }
  // end 'show'

  // helper
  function newElement ( nodename, classname, parent, hidden ) {

    var dom, newElem;

    if ( document instanceof SVGDocument ) {
      dom = document.implementation.createHTMLDocument(document.URL);
    } else {
      dom = document;
    }
    newElem = dom.createElement(nodename);
    newElem.className = classname;
    if ( hidden === true ) { hide ( newElem ); }
    parent.appendChild(newElem);
    return newElem;
  }
  // end 'newElement'

  // helper
  function notifyGlobal ( message, value ) {
    safari.self.tab.dispatchMessage( message, value );
  }
  // end 'notifyGlobal'

  //////////////////////////////////////////////////////////////////////////////////

  // Class █████████████████████████████████████████████████████████████████████████
  function SuperImage (image) {

    var supi = this,
    imageWidth  = image.naturalWidth,
    imageHeight = image.naturalHeight;

    // Class ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function Equalizer () {

      // TO DO: add routines for multiple images

      // local Equalizer -----------------------------------------------------------
      function nulledArray256 () {
        var i, arr = [];
        for ( i = 0; i < 256; i++ ) { arr[i] = 0; }
        return arr;
      }
      // end 'nulledArray256'

      // local Equalizer -----------------------------------------------------------
      function averageBorderColor (c) {
        var
        i, subpixel, offset,
        w = imageWidth, h = imageHeight,
        d = 1, // distance from border, >= 0
        b = 3, // breadth of the sample, > 0
        db = 2 * d + b,
        borders,
        data,
        len,
        lensum = 0,
        color = [ 0, 0, 0, 0 ];

        if ( w > db && h > db ) {
          borders = [
          //SAMPLE          left      top      width        height
          c.getImageData(    d,       d,       w-db,          b     ), // horizontal top
          c.getImageData(    d+b,     h-d-b,   w-db,          b     ), // horizontal bottom
          c.getImageData(    d,       d+b,     b,           h-db    ), // vertical left
          c.getImageData(    w-d-b,   d,       b,           h-db    )  // vertical right
          ];

          for ( i = 0; i < 4; i++) {
            data = borders[i].data;
            len = data.length;
            lensum += len / 4;
            for ( subpixel = 0; subpixel < len; subpixel = subpixel + 4 ) {
              for ( offset = 0; offset < 4; offset++) {
                color[ offset ] += data[ subpixel + offset ];
              }
            }
          }
          for ( i = 0; i < 4; i++ ) {
            color[i] = Math.round( color[i] / lensum );
          }
          return color;
        } else {
          return 0;
        }
      }
      // end 'averageBorderColor'

      // SubClass Equalizer --------------------------------------------------------
      function Histogram ( pixData ) {
        // builds color histogram of {array} pixData ( [ 4 x pixel count ] bytes )
        // TIME CRITICAL --- consumes about half of the processing time
        var
        hist = this,
        color,
        range = [],
        subpixel,
        dataLength = pixData.length,
        minQuality = 0.9, // must be >> 0 and <= 1; 1 means we need a perfect histogram, 0 never triggers color correction
        clipPercentage = 0.5; // percetage of bright and dark pixels thrown away - must be <<< 50 (photoshop default: .5)


        // local Histogram 'clip'
        function clipColor ( percent ) {
          // we are clipping a certain percentage of the pixels on the bright and dark ends of the histogram
          var
          maxClippedPixels = Math.floor( ( dataLength / 400 ) * percent ),
          samples,
          lower = 0,
          upper = 255;

          samples = 0; while ( samples <= maxClippedPixels ) { samples += hist.data[color][ lower++ ]; }
          samples = 0; while ( samples <= maxClippedPixels ) { samples += hist.data[color][ upper-- ]; }

          return { 'lower' : lower, 'upper' : upper };
        }
        // end local 'clip'

        // initialize histogram data
        this.data = [];
        for (color = 0; color < 3; color++) {
          this.data[color] = nulledArray256();
        }

        // OPTIMIZED CODE FOLLOWS
        subpixel = dataLength - 1;
        while (true) {
          subpixel--;
          this.data[2][pixData[subpixel]]++; subpixel--;
          this.data[1][pixData[subpixel]]++; subpixel--;
          this.data[0][pixData[subpixel]]++; subpixel--;
          if ( subpixel < 0 ) { break; }
        }
        // END OPTIMIZED CODE

        this.clipping = [];
        // calculate six histogram clipping points (r, g, b, each lower and upper)
        for (color = 0; color < 3; color++) {
          this.clipping[color] = clipColor( clipPercentage );
        }

        // calculate three histogram stretch factors (r, g, b) and overall histogram quality while clipping extreme values
        this.quality = 1;
        this.stretchFactor = [];

        for ( color = 0; color < 3; color++ ) { 
          range[color] = this.clipping[color]['upper'] - this.clipping[color]['lower'] + 1; // integer between 1 and 256
          this.stretchFactor[color] = 256 / range[color]; // float >= 1 and <= 256
          this.quality /= this.stretchFactor[color]; // float > 0 and <= 1
        }
        this.good = ( this.quality >= minQuality );
      }
      // end 'Histogram'

      // SubClass Equalizer --------------------------------------------------------
      function LookUpTable ( hist ) {

        // TIME CRITICAL --- LookupTable.employ consumes about half of the processing time
        var color, value;

        this.employ = function (pMap) {
          var subpixel = pMap.length - 1;
          // HAND OPTIMIZED CODE BELOW!
          while (true) {
            subpixel--; pMap[subpixel] = this.table[2][pMap[subpixel]];
            subpixel--; pMap[subpixel] = this.table[1][pMap[subpixel]];
            subpixel--; pMap[subpixel] = this.table[0][pMap[subpixel]];
            if (subpixel-- === 0) { return; }
          }
        };

        this.table = [];
        for (color = 0; color < 3; color++) {
          this.table[color] = nulledArray256();
          for (value = 0; value < 256; value++ ) {
            this.table[color][value] = ~~ ( ( value - hist.clipping[color]['lower'] ) * hist.stretchFactor[color] );
          }
        }
      }
      // end 'LookUpTable'

      // SubClass Equalizer ---------------------------------------------- Indicator
      function Indicator () {
        //for singe image situation
        this.elem = newElement( 'div', 'indicator', document.body, false );
        this.toggle = function (show) {
          switch (show) {
            case true :
            show ( this.elem );
            break;
            case false:
            hide( this.elem );
            break;
          }
        };
      }
      // end 'Equalizer.Indicator'

      // method Equalizer -------------------------------------------------- analyze
      this.analyze = function () {

        var
        canvas = document.createElement('canvas'),
        ctx;

        supi.indicator = new Indicator().elem;

        // a canvas is used for histogram creation and correction
        canvas.style.display = 'none';
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        canvas.classList.add( 'picture' );
        document.body.appendChild( canvas );

        ctx = canvas.getContext('2d');
        ctx.drawImage( image, 0, 0 );

        supi.bcol1 = averageBorderColor(ctx);

        supi.imageData = ctx.getImageData( 0, 0, imageWidth, imageHeight );
        supi.histogram = new Histogram ( supi.imageData.data );
        supi.equalizer = canvas;
        notifyGlobal('GoodImage', supi.histogram.good );
        if ( supi.histogram.good ) {
          supi.indicator.classList.add('inactive');
        } else {
          supi.indicator.classList.remove('inactive');
        }
      };
      // end 'Equalizer.analyze'

      // method Equalizer ----------------------------------------------------------
      this.correct = function () {

        var
        ctx = supi.equalizer.getContext('2d'),
        lut;

        if ( !supi.histogram.good ) {
          lut = new LookUpTable ( supi.histogram );
          lut.employ( supi.imageData.data );
          ctx.putImageData( supi.imageData, 0, 0 );
          supi.bcol2 = averageBorderColor(ctx);
          supi.equalizer.style.display = null;
          supi.rendered = true;
        }
      };
      // end 'Equalizer.correct'

      this.analyze();

    }
    // end Class 'SuperImage.Equalizer'

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.save = function () {

      var
      imgData = supi.equalizer.toDataURL();

      document.location.href = imgData.replace('image/png', 'image/octet-stream');
    };
    // end method 'Equalizer.save'

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.fitToSoloImage = function () {
      //  for singe image documents only!
      var csstext =
      'top: ' + image.offsetTop + 'px; ' +
      'left: ' + image.offsetLeft + 'px; ' +
      'height: ' + image.offsetHeight + 'px; ' +
      'width: ' + image.offsetWidth + 'px;';
      supi.equalizer.style.cssText = csstext;
    };
    // end method 'SuperImage.fitToSoloImage'

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.toggle = function (e) {
      // @param {event} or {bool} e
      var active;

      if ( e.type && e.type === 'dblclick' ) {
        e.preventDefault();
        if ( !(/picture/.test(e.target.className) ) && e.detail === 2 ) {
          notifyGlobal( 'equalized', !supi.active && !supi.histogram.good );
        }
      } else {
        active = e && !supi.histogram.good;
        if ( active && !supi.rendered ) {
          supi.eq.correct();
        }
        if ( active !== supi.active ) {
          supi.active = active;
        }
      }
    };
    // end method 'SuperImage.toggle'

    this.active = false;
    this.rendered = false;
    this.eq = new Equalizer ();

  }
  // end 'SuperImage'

  // Class █████████████████████████████████████████████████████████████████████████
  function Instructions () {

    var inst = this;

    notifyGlobal( 'inst', false );

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.create = function ( text ) {

      var i, txt;

      this.win = newElement( 'inst', 'instructions', document.body, true ); // special tagName needed for SVG handling
      this.win.xButton = newElement( 'div', 'xButton', this.win);
      this.win.xButton.addEventListener('click', inst.toggle, false);
      for ( i = 0; i < text.length; i++ ) {
        txt = newElement( text[i][0], null, this.win );
        txt.innerHTML = text[i][1];
      }
      setTimeout( function() { show ( inst.win ); notifyGlobal( 'inst', true ); }, 1 ); // to make it appear the first time
    };
    // end 'Instructions.create'

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.toggle = function ( showIt ) {
      switch ( showIt ) {
        case true :
        if ( inst.win ) {  
          show ( inst.win );
        } else {
          notifyGlobal( 'instructions' );
        }
        inst.visible = true;
        break;
        default :
        if ( inst.win ) {  
          hide ( inst.win );
        }
        inst.visible = false;
        notifyGlobal( 'inst', false );
        break;
      }
    };
    // end 'Instructions.toggle'

  }
  // end 'Instructions'

  //////////////////////////////////////////////////////////////////////////////////

  // Class █████████████████████████████████████████████████████████████████████████
  function SoloImage ( image, e ) {

    var
    solo = this,
    startY = 0,
    oldBgCol = 0,
    dragging = false,
    imageWidth,
    imageHeight,
    imageAspect;

    // helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function setBgCol (cl) {
      if ( cl !== undefined ) {
        if ( cl.length ) {
          document.body.style.backgroundColor = 'rgb( ' + cl[0] + ', ' + cl[1] + ', ' + cl[2] + ' )';
        } else {
          solo.bgCol = cl;
          document.body.style.backgroundColor = 'rgb( ' + cl + ', ' + cl + ', ' + cl + ' )';
        }
      } else {
        document.body.style.backgroundColor = 'rgb( ' + solo.bgCol + ', ' + solo.bgCol + ', ' + solo.bgCol + ' )';
      }
    }
    // end 'setBgCol'

    // helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function cleanAttributes (el) {

      var i;

      if ( el.attributes ) {
        for ( i = el.attributes.length; i > 0; i-- ) {
          if ( !(/^src$/i.test(el.attributes[i-1].nodeName)) ) {
            el.removeAttributeNode( el.attributes[i-1] );
          }
        }
      }
    }
    // end 'cleanAttributes'

    // helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function setStyleClass (effect) {
      document.body.id = effect;
    }
    // end 'setStyleClass'

    // event handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drag (e) {

      switch ( e.type ) {
        case 'mousedown' :
        if (/BODY|HTML/i.test(e.target.tagName)) {
          document.body.classList.add('drag');
          startY = e.clientY;
          if( solo.bgCol === undefined ) {
            solo.bgCol = 0;
          }
          oldBgCol = solo.bgCol;
          dragging = true;
        }
        break;
        case 'mousemove' :
        if ( dragging ) {
          solo.bgCol = oldBgCol + ( startY - e.clientY );
          if (solo.bgCol <   0) { startY -=  solo.bgCol;        solo.bgCol = 0;   }
          if (solo.bgCol > 255) { startY -= (solo.bgCol - 255); solo.bgCol = 255; }
          setBgCol();
          notifyGlobal( 'bgColor', solo.bgCol );
        }
        break;
        case 'mouseup' :
        case 'mouseout' :
        if ( dragging ) {
          dragging = false;
          document.body.classList.remove('drag');
          if ( solo.bgCol !== oldBgCol ) {
            notifyGlobal('saveBgColor', solo.bgCol);
          }
        }
        break;
      }
    }
    // end 'drag'

    // event handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function handleContextMenu (e) {
      safari.self.tab.setContextMenuEventUserInfo( e, e.target.nodeName) ;
    }
    // end 'handleContextMenu'

    // event handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function handleKeypress (key) {
      if ( /27|38/.test(key.keyCode) ) {
        window.close();
      }
    }
    // end 'handleKeypress'

    // local ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function toggleZoom (e) {
      // @param {event} e click or {bool}
      if (
      e.type && 
      e.type   === 'click' && 
      e.which  === 1 && 
      e.button === 0 && 
      e.target.parentNode === document.body ) {
        notifyGlobal( 'zoom', !solo.zoom );
      } else {
        if ( e !== solo.zoom && ( e === true || e === false ) ) {
          solo.zoom = e;
        }
      }
    }
    // end 'toggleZoom'

    // method ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.redraw = function () {

      var
      windowHeight = window.innerHeight,
      windowWidth  = window.innerWidth,
      windowAspect = windowHeight / windowWidth,
      imageBigger  = imageWidth > windowWidth || imageHeight > windowHeight,
      bodyWider    = windowAspect < imageAspect,
      csstext      = null,
      hidden       = false;

      if ( this.lastValues.imageBigger !== imageBigger ||
      this.lastValues.bodyWider !== bodyWider ||
      this.zoom !== this.lastValues.zoom ) {
        this.lastValues.imageBigger = imageBigger;
        this.lastValues.bodyWider = bodyWider;
        // make image and superImage not render for a moment
        image.style.display = 'none';
        hidden = true;
        if ( this.superImage.rendered ) {
          this.superImage.equalizer.style.display = 'none';
          hide ( this.superImage.equalizer );
        }
        if ( imageBigger ) {
          document.body.classList.add('bigger');
        } else {
          document.body.classList.remove('bigger');
        }
        if ( bodyWider ) {
          document.body.classList.add('wider');
        } else {
          document.body.classList.remove('wider');
        }
      }
      if ( this.lastValues.windowHeight !== windowHeight ) {
        this.lastValues.windowHeight = windowHeight;
        document.body.style.lineHeight = windowHeight + 'px';
      }

      if ( this.lastValues.zoom !== this.zoom ) {
        this.lastValues.zoom = this.zoom;
        if ( this.zoom ) {
          document.body.classList.add('zoom');
          csstext = null; // forget image size constraints
        } else {
          document.body.classList.remove('zoom');
          csstext = 'width: ' + imageWidth + 'px; height: ' + imageHeight + 'px;'; // force image to display at it's natural size
        }
        image.style.cssText = csstext;
      }

      // now make the image visible again
      if ( hidden ) { 
        image.style.display = null;
        if ( this.superImage.rendered ) { this.superImage.equalizer.style.display = null; }
      }
      // remove properties added by safari against our wishes
      image.removeAttribute('width');
      image.removeAttribute('height');

      // switch between 'image' and 'super image'
      if ( this.superImage.rendered ) { 
        this.superImage.fitToSoloImage();
      }
      if ( this.superImage.active ) {
        show ( this.superImage.equalizer );
        show ( this.superImage.indicator );
        hide ( image );
      } else {
        hide ( this.superImage.equalizer );
        hide ( this.superImage.indicator );
        show ( image );
      }
      if ( this.superImage.autoBgCol ) {
        setBgCol ( this.superImage.active ? this.superImage.bcol2 : this.superImage.bcol1 );
      } else {
        setBgCol ( this.bgCol );
      }
    };
    // end 'redraw'

    // messaging inbound ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function respond ( message ) {
      // console.log('MESSAGE ' + message.name );

      var m = message.message;

      switch (message.name) {
        case 'settings' :
        if ( !solo.svg ) {
          solo.superImage.autoBgCol = m.auto;
          if ( !solo.superImage.autoBgCol ) {
            setBgCol( parseInt( m.bcol, 10 ) );
          }
          solo.superImage.toggle( m.equi );
        }
        setStyleClass( m.efct );
        toggleZoom( m.zoom );
        solo.redraw();
        break;

        case 'Zoom'         : toggleZoom( m ); solo.redraw();                                    break;
        case 'bgCol'        : setBgCol(parseInt( m, 10));                                   break;
        case 'AutoBGColor'  : if ( !solo.svg ) { solo.superImage.autoBgCol = m; solo.redraw(); } break;
        case 'Equalize'     : if ( !solo.svg ) { solo.superImage.toggle( m ); solo.redraw(); }   break;
        case 'Effect'       : setStyleClass( m );                                           break;

        case 'instructions' : solo.instructions.create( m );                                break;
        case 'toggle_instr' : solo.instructions.toggle( m );                                break;

        case 'downloadEQ'   : if ( !solo.svg ) { solo.superImage.save(); }                  break;

        default             :                                                               break;
      }
    }
    // end 'respond'

    // messaging outbound ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.sendLocalSettings = function () {
      // called on 'focus' to restore the settings of the window
      notifyGlobal('localSettings', {
        zoom : this.zoom,
        equa : !this.svg && this.superImage.active,
        bcol : this.bgCol,
        inst : this.instructions.visible,
        good : this.svg || this.superImage.histogram.good
      });
    };
    // end 'sendLocalSettings'

    // local ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.init = (function () {
      // first, clean up malformed pages (picasa!)
      solo.lastValues = {
        windowHeight : null,
        imageBigger  : null,
        bodyWider    : null,
        zoom         : null
      };

      solo.svg = image.classList.contains('svgWrapper');

      cleanAttributes(document.body);
      document.body.classList.add('CenterImages');
      cleanAttributes(image);
      hide ( image );
      image.classList.add('picture');

      solo.instructions = new Instructions ();
      if ( !solo.svg ) {
        solo.superImage = new SuperImage (image);
      }
      solo.bgCol   = 0;
      imageWidth   = image.naturalWidth  || image.sizeX;
      imageHeight  = image.naturalHeight || image.sizeY;
      imageAspect  = imageHeight / imageWidth;
      solo.zoom = false;

      // trick to get the vertical center without additional css
      document.body.insertBefore(document.createTextNode("\u00a0"), document.body.firstChild.nextSibling );

      // anonymous self-executing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      (function addAllDarnedEventlisteners () {
        safari.self.addEventListener('message', respond, false);

        window.addEventListener('keydown', handleKeypress, false);
        window.addEventListener('resize', solo.redraw, false);

        document.addEventListener( 'mousedown', drag, false);
        document.addEventListener( 'mousemove', drag, false);
        document.addEventListener( 'mouseup', drag, false);
        // document.addEventListener( 'mouseout', drag, false);
        document.addEventListener( 'contextmenu', handleContextMenu, false);
        document.addEventListener( 'click', toggleZoom, false);
        if ( !solo.svg ) {
          document.addEventListener( 'dblclick', solo.superImage.toggle, false);
        }
      })();
      // end 'addAllDarnedEventlisteners'

      // now we can ask the global page for the settings
      notifyGlobal('settings');
    })();
    // end 'init'

    // -----------------------------------------------------------------------------

  }
  // end 'soloImage'

  // main function █████████████████████████████████████████████████████████████████
  function multipleImages (images) {

    var i;

    // Class 'Hud'
    function Hud (image) {

      var hud = this;

      function findPos(element) {

        var curleft = 0, curtop = 0;

        if ( element.offsetParent ) {
          while (element.offsetParent) {
            curleft += element.offsetLeft;
            curtop  += element.offsetTop;
            element = element.offsetParent;
          }
        }
        else if ( element.x || element.y ) {
          curleft = element.x;
          curtop = element.y;
        }
        return { top: curtop, left: curleft };
      }


      this. image = image;

      this.bar = newElement ( 'div', 'hud', document.body );
      this.button = newElement ( 'span', 'button', this.bar);

      this.show = function (e) {
        switch (e.type) {
          case 'mouseover' :
          if (e.target.nodeName === 'IMG') {
            e.target.hud.toggle(true);
          }
          break;
          case 'mouseout' :
          if ( e.toElement !== e.target.hud.bar ) {
            e.target.hud.toggle(false);
          }
          if ( e.target.className === 'hud'
          && e.toElement !== e.target.image
          && e.toElement.className !== 'button' ) {
            e.target.toggle(false);
          }
          break;
        }
      };

      this.toggle = function (doit) {
        switch (doit) {
          case false :
          hide ( this.bar );
          break;
          case true :
          show ( this.bar );
          break;
        }
      };

      this.enhancedImage = function () {
        image.betterImage = new SuperImage (image);
      };

      this.fitToImage = function () {

        var pos = findPos(image);

        this.bar.style.top = pos.top + image.offsetHeight + 'px';
        this.bar.style.left = pos.left + 'px';
        this.bar.style.width = image.offsetWidth + 'px';
      };

      this.button.addEventListener('click', hud.enhancedImage, false);
      this.bar.addEventListener('mouseout', hud.show, false);

      this.image.addEventListener('mouseover', hud.toggle, false);
      this.image.addEventListener('mouseout', hud.toggle, false);

      // if (!xxxx.histogram.good) { this.fitToImage(); }
      this.image.classList.add('hasHud');
    }
    // end Class 'Hud'

    for (i = 0; i < images.length; i++) {
      images[i].hud = new Hud ( images[i] );
    }
  }
  // end main function 'multipleImages'

  //////////////////////////////////////////////////////////////////////////////////

  var
  centerImages = null,
  sugus = (function () {

    var
    images,
    children,
    i;

    // local
    function svgHack () {

      var
      svg,
      html,
      body,
      wrapper,
      i;

      for ( i = 0; i < document.childNodes.length; i++ ) {
        if ( /svg/i.test(document.childNodes[i].tagName) ) {
          svg = document.childNodes[i];
        }
      }

      document.removeChild(svg);
      html = newElement('HTML', null, document, false );
      body = newElement('BODY', null, html, false );
      wrapper = newElement('IMG', 'svgWrapper', body, false );
      wrapper.src = document.URL;
      wrapper.sizeX = svg.width.baseVal.value;
      wrapper.sizeY = svg.height.baseVal.value;
      return wrapper;
    }
    // end 'svgHack'

    // local
    function imageBamPostHack () {
      var head, body, image;
      document.body.removeAttribute('onload');
      head = document.getElementsByTagName('HEAD')[0];
      body = document.getElementsByTagName('BODY')[0];
      document.lastChild.removeChild(head);
      document.lastChild.removeChild(body);
      document.lastChild.appendChild(document.createElement('BODY'));
      image = document.createElement('IMG');
      document.body.appendChild(image);
      image.src = '';
    }
    // end 'imageBamPostHack'

    // catch SVG first!
    if ( /imagebam/i.test(document.URL) ) {
      imageBamPostHack();
      return { kind : 'imagebam', payload : null };
    }
    if ( document instanceof SVGDocument ) {
      return { kind: 'svg', payload : svgHack() }; // ██████████████████
    } else {
      images = document.images;
      children = document.body.childNodes;

      if (document.head === null) {
        // BINGO!!! this is an 'ImageDocument'
        return { kind : 'classic', payload : images[0] }; // ██████████████████
      }

      if ( document.body ) { // we have a well-formed document ...
        if ( images.length === 1 ) { // ... that contains just one image ..
          for ( i = 0; i < children.length; i++ ) { // but maybe divx has spoiled the document!
            if ( children[i].nodeType === 1 && children[i].id !== 'myEventWatcherDiv' && children[i].tagName !== 'IMG' ) {
              return { kind : null, payload : null }; // ██████████████████
            }
          } 
          return { kind : 'edge', payload : images[0] }; // ██████████████████
        } else if ( images.length > 1 ) {
          // these are the images of a 'normal' page
          return { kind : 'multi', payload : images }; // ██████████████████
        }
      } 

      // nothing useful found
      return { kind : null, payload : null }; // ██████████████████
    }
  })();

  // 'sugus' is the essence of the page - its images!
  function start (e) {
    if ( window.top !== window.self ) {
      document.images[0].style.opacity = '1';
      // notifyGlobal('iframe');
    } else {
      if ( e === null ) {
        switch ( sugus.kind ) {
          case 'classic' :
          case 'edge' : 
          case 'svg' : centerImages = new SoloImage( sugus.payload, e );
          break;
          case 'imagebam' : break;
          case 'multi' :
          // multipleImages( sugus.payload, e );
          notifyGlobal('noImage');
          break;
          default :
          notifyGlobal('noImage');
          break;
        }
      } else {
        if ( centerImages !== null ) {
          centerImages.sendLocalSettings();
        } else {
          notifyGlobal('noImage');
        }
      }
    }
  }

  start( null );
  window.addEventListener('focus', start, false);

})();