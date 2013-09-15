/**
*    injected.js
*
*    CenterImages Safari Extension
*    Version 6.0.2

*    © 2012 lucdesign
**/

/*global window, document, safari, strings, document, imageBamHack */

// protect the global scope
(function() {

  // shim (adds .classList to safari 5 and below)
  (function() {
    if (document.createElement('a').classList === undefined) {
      /*
      * classList.js: element.classList implementation.
      * By Eli Grey, http://eligrey.com
      * Grossly simplified by lucdesign (http://www.luc.at) for inclusion here in 2012
      *
      * Public Domain.
      * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
      */
      /*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
      var
      checkTokenAndGetIndex = function (classList, token) { return classList.indexOf(token); },
      ClassList = function (elem) {
        var
        trimmedClasses = elem.className.trim(),
        classes = trimmedClasses ? trimmedClasses.split(/\s+/) : [],
        i = 0,
        len = classes.length;
        for (; i < len; i++) {
          this.push(classes[i]);
        }
        this.updateClassName = function () {
          elem.className = this.toString();
        };
      },
      classListGetter = function () { return new ClassList(this); };

      ClassList.prototype.contains = function (token) { return checkTokenAndGetIndex(this, token) !== -1; };
      ClassList.prototype.add = function (token) {
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.push(token);
          this.updateClassName();
        }
      };
      ClassList.prototype.remove = function (token) {
        var index = checkTokenAndGetIndex(this, token);
        if (index !== - 1) {
          this.splice(index, 1);
          this.updateClassName();
        }
      };
      ClassList.prototype.toggle = function (token) {
        if (checkTokenAndGetIndex(this, token) === - 1) {
          this.add(token);
        } else {
          this.remove(token);
        }
      };
      ClassList.prototype.toString = function () { return this.join(' '); };

      Object.defineProperty(window.HTMLElement.prototype, 'classList', { get: classListGetter, enumerable: true, configurable: true });
    }
  }
  ());

  // talk to the bar and the global page
  function notifyGlobal(message, value) {
    if (safari.self.tab.dispatchMessage) {
      safari.self.tab.dispatchMessage(message, value);
    }
  }

  // setting classes of document.body depending on a condition
  function setClass(cls, condition) {
    if (condition === true) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls); 
    }
  }

  // helper to create new elements
  function newElement(nodeType, classes, domParent) {
    var
    doc = document instanceof window.SVGDocument ? document.implementation.createHTMLDocument(document.URL) : document,
    newElem = doc.createElement(nodeType);
    newElem.classList.add(classes);
    domParent.appendChild(newElem);
    return newElem;
  }

  // this class wraps the image(s)
  function CI(image, kind) {
    
    var
    cI = this,
    startY = 0,
    startGrey,
    mousedown = false,
    dragging = false,
    pic = {},
    win = {
      w : window.innerWidth,
      h : window.innerHeight
    },
    proxyInfo = {
      created : false,
      active : false
    },
    background = {
      auto : false,
      color : [0,0,0],
      grey : undefined,
      color0 : undefined,
      color1 : undefined
    },
    local = {
      zoomed : undefined,
      enhanced : false
    },
    indicator = newElement('div', 'indicator', document.body),
    helpWindow = new HelpWindow();

    function Proxy(image) {

      var self = this,
      imageData,
      clipping = [],
      factor = [], // percentage of bright and dark pixels thrown away - must be <<< 50 (photoshop default: .5)
      canvas = (function(image) {
        var cv = document.createElement('canvas');
        cv.width = pic.w;
        cv.height = pic.h;
        cv.getContext('2d').drawImage(image, 0, 0);
        return cv;
      }(image)),
      ctx = canvas.getContext('2d');

      // helper
      function nulledMatrix(x, y) {
        var i, arr = [], mat = [];
        for (i = 0; i < y; i++) {
          arr[i] = 0;
        }
        for (i = 0; i < x; i++) {
          mat.push(arr.slice(0));
        }
        return mat;
      }

      function averageBorderColor(c2d) {
        var
        i, sample, offset,
        w = pic.w, h = pic.h,
        d = 1, // distance from border, >= 0
        b = 3, // breadth of the sample, > 0
        db = 2 * d + b,
        borders,
        data,
        len,
        lensum = 0,
        color = [ 0, 0, 0 ];


        if (w > db && h > db) {
          borders = [
          //SAMPLE              left     top      width    height
          c2d.getImageData(     d,       d,       w-db,    b      ), // horizontal top
          c2d.getImageData(     d+b,     h-d-b,   w-db,    b      ), // horizontal bottom
          c2d.getImageData(     d,       d+b,     b,       h-db   ), // vertical   left
          c2d.getImageData(     w-d-b,   d,       b,       h-db   )  // vertical   right
          ];

          for (i = 0; i < 4; i++) {
            data = borders[i].data;
            len = data.length;
            lensum += len;
            for (sample = 0; sample < len; sample = sample + 4) {
              for (offset = 0; offset < 3; offset++) {
                color[offset] += data[sample + offset];
              }
            }
          }

          for (i = 0; i < 3; i++) {
            color[i] = Math.round(color[i] / (lensum / 4));
          }
          return color;
        }
        return;
      }

      function checkHistogram(pix) {
        // scans color distribution of {array} pixData ([4 x pixel count] bytes)
        // TIME CRITICAL --- consumes about half of the processing time
        var
        histData = nulledMatrix(3, 256),
        channel,
        quality,
        range = [],
        pointer,
        minQuality = 0.9, // must be >> 0 and <= 1; 1 means we need a perfect color distribution, 0 never triggers equalizer
        clipPercentage = 0.05;

        // this is where the statistics are created.
        // OPTIMIZED CODE FOLLOWS
        pointer = pix.length;
        while (pointer--) {
          histData[2][pix[--pointer]]++;
          histData[1][pix[--pointer]]++;
          histData[0][pix[--pointer]]++;
        }
        // END OPTIMIZED CODE

        // calculate six extreme points (r, g, b, each lower and upper)
        clipping = (function(percent, hist, dat) {
          // we are throwing away a certain percentage of the pixels on the bright and dark ends of the spectrum
          var
          maxClipping = Math.floor((dat.length / 400) * percent),
          minimum, maximum,
          channel,
          dark, light,
          bounds = [];

          for (channel = 0; channel < 3; channel++) {
            dark = 0;
            light = 0;
            minimum = 0;
            maximum = 255;
            while (dark  <= maxClipping) { dark  += hist[channel][minimum++]; }
            while (light <= maxClipping) { light += hist[channel][maximum--]; }
            bounds[channel] = { lower : minimum, upper : maximum };
          }
          return bounds;
        }(clipPercentage, histData, pix));

        // calculate three stretch factors (r, g, b) and overall quality while trashing extreme values
        quality = 1;
        for (channel = 0; channel < 3; channel++) {
          range[channel] = clipping[channel].upper - clipping[channel].lower + 1; // integer between 1 and 256
          factor[channel] = 256 / range[channel]; // float >= 1 and <= 256
          quality /= factor[channel]; // float > 0 and <= 1
        }
        pic.isDull = (quality < minQuality);
      }

      function colorCorrect(d, c, f) {
        var channel, value, lut = nulledMatrix(3, 256);

        // ceate LUT tables for colors R, G, B

        for (channel = 0; channel < 3; channel++) {
          for (value = 0; value < 256; value++) {
            lut[channel][value] = ~~ ((value - c[channel].lower) * f[channel]);
          }
        }

        // lookup table returns a color conversion function
        // TIME CRITICAL --- this function consumes about a third of the processing time
        return (function(pMap) {
          // OPTIMIZED CODE. counts down to 0.
          var
          data = pMap.data,
          pointer = data.length; // set pointer to end of pmap

          while (pointer--) {
            data[--pointer] = lut[2][data[pointer--]];
            data[pointer]   = lut[1][data[pointer--]];
            data[pointer]   = lut[0][data[pointer]];
          }
          return pMap;
          // END OPTIMIZED CODE
        }(d));
      }

      (function() {
        // 'img' is the proxy
        background.color0 = averageBorderColor(ctx);
        imageData = ctx.getImageData(0, 0, pic.w, pic.h);
        checkHistogram(imageData.data);
      }());

      this.render = function() {
        ctx.putImageData(colorCorrect(imageData, clipping, factor), 0, 0);
        background.color1 = averageBorderColor(ctx);
        self.img = newElement('img', null, document.body);
        self.img.style.cssText = image.style.cssText;
        self.img.id = 'proxy';
        self.img.src = canvas.toDataURL();
        proxyInfo.created = true;
      };

    }

    function HelpWindow() {

      var i, txt, win, xButton, help = this;

      this.visible = false;

      this.populate = function(text) {
        win = newElement('inst', 'helpWindow', document.body); // special tagName needed for SVG handling
        xButton = newElement('div', 'xButton', win);
        xButton.addEventListener('click', function(){ help.popup(false); }, false);
        for (i = 0; i < text.length; i++) {
          txt = newElement(text[i][0], null, win);
          txt.innerHTML = text[i][1];
        }
        window.setTimeout(function(){ help.popup(true);}, 200);
      };

      this.popup = function(showIt) {
        if (win === undefined) {
          notifyGlobal('helpWindow');
        } else {
          setClass('help', showIt);
          notifyGlobal('help', showIt);
          help.visible = showIt;
        }
      };
    }

    function setBackground(grey, auto) {
      var
      oldColorJoined = background.color.join(','),
      oldGrey = background.grey,
      oldAuto = background.auto;

      grey = grey === undefined ? oldGrey : grey;
      auto = auto === undefined ? oldAuto : auto && pic.isRGB;

      if (auto) {
        background.auto = true;
        background.color = proxyInfo.active ? background.color1 : background.color0;
        background.grey = ~~(0.21 * background.color[0] + 0.71 * background.color[1] + 0.07 * background.color[2]);
      } else if (oldAuto) {
        background.auto = false;
        background.color = [background.grey, background.grey, background.grey];
      } else {
        background.grey = grey;
        background.color = [grey, grey, grey];
      }

      if (background.auto !== oldAuto ) {
        notifyGlobal('AutoBgColor', background.auto);
      }
      if (background.grey !== oldGrey ) {
        notifyGlobal('BgColor', background.grey);
      }
      if ( background.color.join(',') !== oldColorJoined) {
        document.body.style.backgroundColor = 'rgb(' + background.color.join(',') + ')';
      }
    }

    function cleanAttributes(el) {

      var i;

      if (el.attributes) {
        for (i = el.attributes.length; i > 0; i--) {
          if (!(/^src$/i.test(el.attributes[i-1].nodeName))) {
            el.removeAttributeNode(el.attributes[i-1]);
          }
        }
      }
    }

    function setStyleClass(effect) {
      document.body.id = effect;
    }

    function drag(e) {
      var newGrey;

      if (e.button === 0) {
        switch (e.type) {
          case 'mousedown':
          if (/BODY|HTML/i.test(e.target.tagName)) {
            document.addEventListener('mousemove', drag, false);
            mousedown = true;
            startY = e.clientY;
            startGrey = background.grey;
          }
          break;
          case 'mousemove' :
          if (mousedown) {
            setClass('drag', true);
            dragging = true;
            newGrey = startGrey + (startY - e.clientY);
            if (newGrey <   0) { startY -=  newGrey;        newGrey = 0;   }
            if (newGrey > 255) { startY -= (newGrey - 255); newGrey = 255; }
            setBackground(newGrey, false);
          }
          break;
          case 'mouseup' : case 'mouseout' :
          mousedown = false;
          if (dragging) {
            setClass('drag', false);
            document.removeEventListener('mousemove', drag, false);
            dragging = false;
            setBackground(newGrey, false);
          }
          break;
        }
      }
    }

    function handleContextMenu(e) {
      safari.self.tab.setContextMenuEventUserInfo(e, e.target.nodeName) ;
    }

    function setPosition(flag) {
      var
      css = '',
      oldW = win.w,
      oldH = win.h,
      oldShimPosition = pic.shimPosition,
      oldShimWidth = pic.shimWidth,
      oldShimHeight = pic.shimHeight,
      oldTaller = pic.taller,
      oldWider = pic.wider,
      factor;
      win.w = window.innerWidth;
      win.h = window.innerHeight;
      if (flag || oldW !== win.w || oldH !== win.h || pic.shimPosition === undefined) {
        setClass('bigger', pic.w > win.w || pic.h > win.h );
      }
      if (local.zoomed) {
        pic.shimPosition = pic.aspect < (win.w / win.h) ? 'left' : 'top';
        if (oldShimPosition !== pic.shimPosition || oldShimPosition === null) {
          setClass('shimOnTop', pic.shimPosition === 'top');
        }
        if (pic.shimPosition === 'left') {
          factor = win.h / pic.h;
          pic.shimWidth = Math.floor((win.w - pic.w * factor) / 2);
          pic.shimHeight = 0;
          if (pic.shimWidth !== oldShimWidth) {
            flag = true;
          }
        }
        if (pic.shimPosition === 'top') {
          factor = win.w / pic.w;
          pic.shimHeight = Math.floor((win.h - pic.h * factor) / 2);
          pic.shimWidth = 0;
          if (pic.shimHeight !== oldShimHeight) {
            flag = true;
          }
        }
      } else {
        pic.shimPosition = null;
        pic.shimWidth = pic.shimHeight = 0;
      }
      if (flag) {
        if (local.zoomed) { css = 'margin: ' + pic.shimHeight + 'px 0 0 ' + pic.shimWidth + 'px'; }
        image.style.cssText = css;
        if ( proxyInfo.created ) { cI.proxy.img.style.cssText = css; }
      }

      pic.wider = pic.w > win.w;
      pic.taller = pic.h > win.h;
      if (oldWider !== pic.wider) { setClass('wider', pic.wider ); }
      if (oldTaller !== pic.taller) { setClass('taller', pic.taller ); }

      // remove attributes added by safari against our wishes
      if (image.attributes.length > 3) {
        image.removeAttribute('width');
        image.removeAttribute('height');
      }
    }

    function setZoom(e) {
      var oldZoomed = local.zoomed;
      if (typeof e === 'boolean') {
        local.zoomed = e;
      } else {
        e.stopPropagation();
        if (e.target.parentNode === document.body && e.type === 'click' && e.which  === 1 && e.button === 0 ) {
          local.zoomed = !local.zoomed;
        }
      }
      if (oldZoomed !== local.zoomed) {
        setClass('zoom', local.zoomed);
        if (local.zoomed) {
          document.body.scrollLeft = document.body.scrollTop = 0;
        }
        notifyGlobal('Zoom', local.zoomed);
        setPosition(true);
      }
    }

    function setEnhancement(e) {
      var oldActive = proxyInfo.active;

      if (pic.isDull) {
        if (typeof e === 'boolean') {
          proxyInfo.active = e;
        } else {
          e.stopPropagation();
          if (e.target === document.body && e.detail === 2) {
            proxyInfo.active = !proxyInfo.active;
          }
        }
        if (proxyInfo.active && !proxyInfo.created) {
          cI.proxy.render();
          setPosition(true);
        }
        if (oldActive !== proxyInfo.active) {
          setClass('enhanced', proxyInfo.active);
          setBackground();
          notifyGlobal('Equalize', proxyInfo.active);
        }
      }
    }

    function respond(message) {
      var
      m = message.message,
      n = message.name;
      switch (n) {
        case 'initialize' :
        setStyleClass(m.efct);
        setZoom(m.zoom);
        setEnhancement(m.equi);
        setBackground(parseInt(m.bcol, 10), m.auto);
        break;
        case 'Zoom'            : setZoom(m);                     break;
        case 'AutoBgColor'     : setBackground(undefined, m);    break;
        case 'BgColor'         : setBackground(parseInt(m, 10)); break;
        case 'Equalize'        : setEnhancement(m);              break;
        case 'Effect'          : setStyleClass(m);               break;
        case 'instructions'    : helpWindow.populate(m);         break;
        case 'popup_help'      : helpWindow.popup(m);            break;
        default                :                                 break;
      }
    }

    this.sendTabSettings = function() {
      notifyGlobal('tabSettings', {
        zoom : local.zoomed,
        dull : pic.isDull,
        RGB  : pic.isRGB,
        equi : proxyInfo.active,
        help : helpWindow.visible,
        bcol : background.grey,
        auto : background.auto
      });
    };

    function initCI(image) {
      pic = {
        w : image.naturalWidth  || image.sizeX,
        h : image.naturalHeight || image.sizeY,
        aspect : 1,
        wider : undefined,
        taller : undefined,
        shimPosition : undefined,
        shimWidth : 0,
        shimHeight : 0,
        isRGB : (kind !== 'svg' && kind !== 'imagebam'),
        isDull : false
      };
      pic.aspect = pic.w / pic.h;
      var myStyle = newElement('style', null, document.body),
      myCSS = [
        'body:not(.zoom) img { width: ' + pic.w + 'px; height: ' + pic.h + 'px; }',
        'body:not(.zoom):not(.wider) img { margin-left: ' + (-Math.floor(pic.w / 2)) + 'px; }',
        'body:not(.zoom):not(.taller) img { margin-top: ' + (-Math.floor(pic.h / 2)) + 'px; }',
        'body:not(.zoom).taller { height: ' + pic.h + 'px; }'
      ].join("\n");
      myStyle.appendChild(document.createTextNode(myCSS));
      // clean up malformed pages (look here, picasa!)
      cleanAttributes(image);
      cleanAttributes(document.body);
      setClass('CenterImages', true);

      safari.self.addEventListener('message', respond, false);

      window.addEventListener('resize', function() { setPosition(false); }, false);
      document.addEventListener('mousedown', drag, false);
      document.addEventListener('mouseup', drag, false);
      document.addEventListener('contextmenu', handleContextMenu, false);
      document.addEventListener('click', setZoom, false);

      if (pic.isRGB) { cI.proxy = new Proxy(image); }
      if (pic.isDull) {
        document.addEventListener('dblclick', setEnhancement, false);
        indicator.classList.remove('inactive');
      } else {
        indicator.classList.add('inactive');
      }
      notifyGlobal('dull', pic.isDull);
      notifyGlobal('RGB', pic.isRGB);

      // initialization is done, now we can ask the global page for the settings
      notifyGlobal('sendStandardSettings');
    }

    if ( image.complete ) { initCI(image); } else { image.addEventListener('load', function() {initCI(image);}, false); }
  }

  // check document and create new CI if possible
  (function() {

    var i, singleImage = (function() {
      var
      images = document.images,
      aliasImage,
      src,
      children;

      // iframe alarm!
      if (parent.frames.length > 0) {
        return;
      }

      // classic image document
      if (document.head === null && images.length === 1) {
        return new CI(images[0], 'classic');
      }

      // SVG images make some things a bit difficult
      if (document instanceof window.SVGDocument) {
        while (document.childNodes.length) { document.removeChild(document.lastChild); }
        aliasImage = newElement('IMG', null, newElement('BODY', null, newElement('HTML', null, document)));
        aliasImage.src = document.URL;
        return new CI(aliasImage, 'svg');
      }

      // imagebam pages need some rearranging
      if ( /^http:\/\/www\.imagebam\.com\/image/i.test(document.URL) ) {
        document.removeEventListener('beforeload', imageBamHack, false);
        for (i = 0; i < images.length; i++) {
          if (images[i].onclick !== null) {
            src = images[i].src;
            break;
          }
        }
        document.body.innerHTML = '';
        aliasImage = newElement('IMG', null, document.body);
        aliasImage.src = src;
        return new CI(aliasImage, 'imagebam');
      }
      
      // imagevenue pages are treated too!
      if ( /^http:\/\/(.*)\.imagevenue\.com\/img\.php/i.test(document.URL) ) {
        console.log('IMAGEVENUE!');
        var thepic = document.getElementById('thepic');
        document.body.innerHTML = '';
        document.body.appendChild(thepic);
        return new CI(thepic, 'classic');
      }
      
      // normal page
      if (images.length > 1) {
        return;
      }
      
      // edge case: single image in a well-formed page
      if (document.body) { // we have a well-formed document with a head...
        children = document.body.childNodes;
        if (images.length === 1) { // ... that contains just one image ..
          for (i = 0; i < children.length; i++) { // but maybe divx has spoiled the document!
            if (children[i].nodeType === 1 && children[i].id !== 'myEventWatcherDiv' && children[i].tagName !== 'IMG') {
              return;
            }
          }
          return new CI(images[0], 'edge');
        }
      }

    }
    ());

    if (singleImage === undefined) {
      notifyGlobal('noCI');
    }
    
    window.addEventListener('focus', function(){ if ( singleImage === undefined ) { notifyGlobal('noCI'); } else { singleImage.sendTabSettings(); } }, false);
    window.addEventListener('blur', function(){ notifyGlobal('blur'); }, false);
  }
  ());

}
());