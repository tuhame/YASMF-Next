/**
 *
 * Provides native-like alert methods, including prompts and messages.
 *
 * @module alert.js
 * @author Kerri Shotts
 * @version 0.4
 *
 * ```
 * Copyright (c) 2013 Kerri Shotts, photoKandy Studios LLC
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following
 * conditions:
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
 * OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 * ```
 */
/*global define*/
define( [ "yasmf/util/core", "yasmf/util/device", "yasmf/util/object", "yasmf/ui/core", "Q", "yasmf/ui/event", "yasmf/util/h" ],
  function ( _y, theDevice, BaseObject, UI, Q, event, h ) {
    "use strict";
    var _className = "Alert";
    var Alert = function () {
      var self = new BaseObject();
      self.subclass( _className );
      /*
       * # Notifications
       *
       * * `buttonTapped` indicates which button was tapped when the view is dismissing
       * * `dismissed` indicates that the alert was dismissed (by user or code)
       */
      self.registerNotification( "buttonTapped" );
      self.registerNotification( "dismissed" );
      /**
       * The title to show in the alert.
       * @property title
       * @type {String}
       */
      self._titleElement = null; // the corresponding DOM element
      self.setTitle = function ( theTitle ) {
        self._title = theTitle;
        if ( self._titleElement !== null ) {
          if ( typeof self._titleElement.textContent !== "undefined" ) {
            self._titleElement.textContent = theTitle;
          } else {
            self._titleElement.innerHTML = theTitle;
          }
        }
      };
      self.defineProperty( "title", {
        read: true,
        write: true,
        default: _y.T( "ALERT" )
      } );
      /**
       * The body of the alert. Leave blank if you don't need to show
       * anything more than the title.
       * @property text
       * @type {String}
       */
      self._textElement = null;
      self.setText = function ( theText ) {
        self._text = theText;
        if ( self._textElement !== null ) {
          if ( typeof theText !== "object" ) {
            if ( typeof self._textElement.textContent !== "undefined" ) {
              self._textElement.textContent = ( "" + theText ).replace( /\<br\w*\/\>/g, "\r\n" );
            } else {
              self._textElement.innerHTML = theText;
            }
          } else {
            h.renderTo( theText, self._textElement, 0 );
          }
        }
      };
      self.defineProperty( "text", {
        read: true,
        write: true
      } );
      /**
       * The alert's buttons are specified in this property. The layout
       * is expected to be: `[ { title: title [, type: type] [, tag: tag] } [, {} ...] ]`
       *
       * Each button's type can be "normal", "bold", "destructive". The tag may be
       * null; if it is, it is assigned the button index. If a tag is specifed (common
       * for cancel buttons), that is the return value.
       * @property buttons
       * @type {Array}
       */
      self._buttons = [];
      self._buttonContainer = null;
      self.defineProperty( "wideButtons", {
        default: "auto"
      } );
      self.setButtons = function ( theButtons ) {
        function touchStart( e ) {
          if ( e.touches !== undefined ) {
            this.startX = e.touches[ 0 ].clientX;
            this.startY = e.touches[ 0 ].clientY;
          } else {
            this.startX = e.clientX;
            this.startY = e.clientY;
          }
          this.moved = false;
        }

        function handleScrolling( e ) {
          var newX = ( e.touches !== undefined ) ? e.touches[ 0 ].clientX : e.clientX,
            newY = ( e.touches !== undefined ) ? e.touches[ 0 ].clientY : e.clientY,
            dX = Math.abs( this.startX - newX ),
            dY = Math.abs( this.startY - newY );
          console.log( dX, dY );
          if ( dX > 20 || dY > 20 ) {
            this.moved = true;
          }
        }

        function dismissWithIndex( idx ) {
          return function ( e ) {
            e.preventDefault();
            if ( this.moved ) {
              return;
            }
            self.dismiss( idx );
          };
        }
        var i;
        // clear out any previous buttons in the DOM
        if ( self._buttonContainer !== null ) {
          for ( i = 0; i < self._buttons.length; i++ ) {
            self._buttonContainer.removeChild( self._buttons[ i ].element );
          }
        }
        self._buttons = theButtons;
        // determine if we need wide buttons or not
        var wideButtons = false;
        if ( self.wideButtons === "auto" ) {
          wideButtons = !( ( self._buttons.length >= 2 ) && ( self._buttons.length <= 3 ) );
        } else {
          wideButtons = self.wideButtons;
        }
        if ( wideButtons ) {
          self._buttonContainer.classList.add( "wide" );
        }
        // add the buttons back to the DOM if we can
        if ( self._buttonContainer !== null ) {
          for ( i = 0; i < self._buttons.length; i++ ) {
            var e = document.createElement( "div" );
            var b = self._buttons[ i ];
            // if the tag is null, give it (i)
            if ( b.tag === null ) {
              b.tag = i;
            }
            // class is ui-alert-button normal|bold|destructive [wide]
            // wide buttons are for 1 button or 4+ buttons.
            e.className = "ui-alert-button " + b.type + " " + ( wideButtons ? "wide" : "" );
            // title
            e.innerHTML = b.title;
            if ( !wideButtons ) {
              // set the width of each button to fill out the alert equally
              // 3 buttons gets 33.333%; 2 gets 50%.
              e.style.width = "" + ( 100 / self._buttons.length ) + "%";
            }
            // listen for a touch
            if ( Hammer ) {
              Hammer( e ).on( "tap", dismissWithIndex( i ) );
            } else {
              event.addListener( e, "touchstart", touchStart );
              event.addListener( e, "touchmove", handleScrolling );
              event.addListener( e, "touchend", dismissWithIndex( i ) );
            }
            b.element = e;
            // add the button to the DOM
            self._buttonContainer.appendChild( b.element );
          }
        }
      };
      self.defineProperty( "buttons", {
        read: true,
        write: true,
        default: []
      } );
      // other DOM elements we need to construct the alert
      self._rootElement = null; // root element contains the container
      self._alertElement = null; // points to the alert itself
      self._vaElement = null; // points to the DIV used to vertically align us
      self._deferred = null; // stores a promise
      /**
       * If true, show() returns a promise.
       * @property usePromise
       * @type {boolean}
       */
      self.defineProperty( "usePromise", {
        read: true,
        write: false,
        default: false
      } );
      /**
       * Indicates if the alert is veisible.
       * @property visible
       * @type {Boolean}
       */
      self.defineProperty( "visible", {
        read: true,
        write: false,
        default: false
      } );
      /**
       * Creates the DOM elements for an Alert. Assumes the styles are
       * already in the style sheet.
       * @method _createElements
       * @private
       */
      self._createElements = function () {
        self._rootElement = document.createElement( "div" );
        self._rootElement.className = "ui-alert-container";
        self._vaElement = document.createElement( "div" );
        self._vaElement.className = "ui-alert-vertical-align";
        self._alertElement = document.createElement( "div" );
        self._alertElement.className = "ui-alert";
        self._titleElement = document.createElement( "div" );
        self._titleElement.className = "ui-alert-title";
        self._textElement = document.createElement( "div" );
        self._textElement.className = "ui-alert-text";
        self._buttonContainer = document.createElement( "div" );
        self._buttonContainer.className = "ui-alert-button-container";
        self._alertElement.appendChild( self._titleElement );
        self._alertElement.appendChild( self._textElement );
        self._alertElement.appendChild( self._buttonContainer );
        self._vaElement.appendChild( self._alertElement );
        self._rootElement.appendChild( self._vaElement );
      };
      /**
       * Called when the back button is pressed. Dismisses with a -1 index. Effectively a Cancel.
       * @method backButtonPressed
       */
      self.backButtonPressed = function () {
        self.dismiss( -1 );
      };
      /**
       * Hide dismisses the alert and dismisses it with -1. Effectively a Cancel.
       * @method hide
       * @return {[type]} [description]
       */
      self.hide = function () {
        self.dismiss( -1 );
      };
      /**
       * Shows an alert.
       * @method show
       * @return {Promise} a promise if usePromise = true
       */
      self.show = function () {
        if ( self.visible ) {
          if ( self.usePromise && self._deferred !== null ) {
            return self._deferred;
          }
          return void 0; // can't do anything more.
        }
        // listen for the back button
        UI.backButton.addListenerForNotification( "backButtonPressed", self.backButtonPressed );
        // add to the body
        document.body.appendChild( self._rootElement );
        // animate in
        UI.styleElement( self._alertElement, "transform", "scale3d(2.00, 2.00,1)" );
        setTimeout( function () {
          self._rootElement.style.opacity = "1";
          self._alertElement.style.opacity = "1";
          UI.styleElement( self._alertElement, "transform", "scale3d(1.00, 1.00,1)" )
        }, 10 );
        self._visible = true;
        if ( self.usePromise ) {
          self._deferred = Q.defer();
          return self._deferred.promise;
        }
      };
      /**
       * Dismisses the alert with the sepcified button index
       *
       * @method dismiss
       * @param {Number} idx
       */
      self.dismiss = function ( idx ) {
        if ( !self.visible ) {
          return;
        }
        // drop the listener for the back button
        UI.backButton.removeListenerForNotification( "backButtonPressed", self.backButtonPressed );
        // remove from the body
        setTimeout( function () {
          self._rootElement.style.opacity = "0";
          UI.styleElement( self._alertElement, "transform", "scale3d(0.75, 0.75,1)" )
        }, 10 );
        setTimeout( function () {
          document.body.removeChild( self._rootElement );
        }, 310 );
        // get notification tag
        var tag = -1;
        if ( ( idx > -1 ) && ( idx < self._buttons.length ) ) {
          tag = self._buttons[ idx ].tag;
        }
        // send our notifications as appropriate
        self.notify( "dismissed" );
        self.notify( "buttonTapped", [ tag ] );
        self._visible = false;
        // and resolve/reject the promise
        if ( self.usePromise ) {
          if ( tag > -1 ) {
            self._deferred.resolve( tag );
          } else {
            self._deferred.reject( new Error( tag ) );
          }
        }
      };
      /**
       * Initializes the Alert and calls _createElements.
       * @method init
       * @return {Object}
       */
      self.override( function init() {
        self.super( _className, "init" );
        self._createElements();
        return self;
      } );
      /**
       * Initializes the Alert. Options includes title, text, buttons, and promise.
       * @method overrideSuper
       * @return {Object}
       */
      self.override( function initWithOptions( options ) {
        self.init();
        if ( typeof options !== "undefined" ) {
          if ( typeof options.title !== "undefined" ) {
            self.title = options.title;
          }
          if ( typeof options.text !== "undefined" ) {
            self.text = options.text;
          }
          if ( typeof options.wideButtons !== "undefined" ) {
            self.wideButtons = options.wideButtons
          }
          if ( typeof options.buttons !== "undefined" ) {
            self.buttons = options.buttons;
          }
          if ( typeof options.promise !== "undefined" ) {
            self._usePromise = options.promise;
          }
        }
        return self;
      } );
      /**
       * Clean up after ourselves.
       * @method destroy
       */
      self.overrideSuper( self.class, "destroy", self.destroy );
      self.destroy = function destroy() {
        if ( self.visible ) {
          self.hide();
          setTimeout( destroy, 600 ); // we won't destroy immediately.
          return;
        }
        self._rootElement = null;
        self._vaElement = null;
        self._alertElement = null;
        self._titleElement = null;
        self._textElement = null;
        self._buttonContainer = null;
        self.super( _className, "destroy" );
      };
      // handle auto-init
      self._autoInit.apply( self, arguments );
      return self;
    };
    /**
     * Creates a button suitable for an Alert
     * @method button
     * @param  {String} title   The title of the button
     * @param  {Object} options The additional options: type and tag
     * @return {Object}         A button
     */
    Alert.button = function ( title, options ) {
      var button = {};
      button.title = title;
      button.type = "normal"; // normal, bold, destructive
      button.tag = null; // assign for a specific tag
      button.enabled = true; // false = disabled.
      button.element = null; // attached DOM element
      if ( typeof options !== "undefined" ) {
        if ( typeof options.type !== "undefined" ) {
          button.type = options.type;
        }
        if ( typeof options.tag !== "undefined" ) {
          button.tag = options.tag;
        }
        if ( typeof options.enabled !== "undefined" ) {
          button.enabled = options.enabled;
        }
      }
      return button;
    };
    /**
     * Creates an OK-style Alert. It only has an OK button.
     * @method OK
     * @param {Object} options Specify the title, text, and promise options if desired.
     */
    Alert.OK = function ( options ) {
      var anOK = new Alert();
      var anOKOptions = {
        title: _y.T( "OK" ),
        text: "",
        buttons: [ Alert.button( _y.T( "OK" ), {
          type: "bold"
        } ) ]
      };
      if ( typeof options !== "undefined" ) {
        if ( typeof options.title !== "undefined" ) {
          anOKOptions.title = options.title;
        }
        if ( typeof options.text !== "undefined" ) {
          anOKOptions.text = options.text;
        }
        if ( typeof options.promise !== "undefined" ) {
          anOKOptions.promise = options.promise;
        }
      }
      anOK.initWithOptions( anOKOptions );
      return anOK;
    };
    /**
     * Creates an OK/Cancel-style Alert. It only has an OK and CANCEL button.
     * @method Confirm
     * @param {Object} options Specify the title, text, and promise options if desired.
     */
    Alert.Confirm = function ( options ) {
      var aConfirmation = new Alert();
      var confirmationOptions = {
        title: _y.T( "Confirm" ),
        text: "",
        buttons: [ Alert.button( _y.T( "OK" ) ),
          Alert.button( _y.T( "Cancel" ), {
            type: "bold",
            tag: -1
          } )
        ]
      };
      if ( typeof options !== "undefined" ) {
        if ( typeof options.title !== "undefined" ) {
          confirmationOptions.title = options.title;
        }
        if ( typeof options.text !== "undefined" ) {
          confirmationOptions.text = options.text;
        }
        if ( typeof options.promise !== "undefined" ) {
          confirmationOptions.promise = options.promise;
        }
      }
      aConfirmation.initWithOptions( confirmationOptions );
      return aConfirmation;
    };
    return Alert;
  } );