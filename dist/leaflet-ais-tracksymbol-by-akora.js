/*
	Leaflet.contextmenu, a context menu for Leaflet.
	(c) 2015, Adam Ratcliffe, GeoSmart Maps Limited
       
        @preserve
*/

(function(factory) {
	// Packaging/modules magic dance
	var L;
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['leaflet'], factory);
	} else if (typeof module !== 'undefined') {
		// Node/CommonJS
		L = require('leaflet');
		module.exports = factory(L);
	} else {
		// Browser globals
		if (typeof window.L === 'undefined') {
			throw new Error('Leaflet must be loaded first');
		}
		factory(window.L);
	}
})(function(L) {

L.Map.mergeOptions({
	contextmenuItems: []
});

L.Map.ContextMenu = L.Handler.extend({

	_touchstart: L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart',

	statics: {
		BASE_CLS: 'leaflet-contextmenu'
	},

	initialize: function (map) {
		L.Handler.prototype.initialize.call(this, map);

		this._items = [];
		this._visible = false;

		var container = this._container = L.DomUtil.create('div', L.Map.ContextMenu.BASE_CLS, map._container);
		container.style.zIndex = 10000;
		container.style.position = 'absolute';

		if (map.options.contextmenuWidth) {
			container.style.width = map.options.contextmenuWidth + 'px';
		}

		this._createItems();

		L.DomEvent
			.on(container, 'click', L.DomEvent.stop)
			.on(container, 'mousedown', L.DomEvent.stop)
			.on(container, 'dblclick', L.DomEvent.stop)
			.on(container, 'contextmenu', L.DomEvent.stop);
	},

	addHooks: function () {
        var container = this._map.getContainer();

		L.DomEvent
            .on(container, 'mouseleave', this._hide, this)
			.on(document, 'keydown', this._onKeyDown, this);

        if (L.Browser.touch) {
            L.DomEvent.on(document, this._touchstart, this._hide, this);
        }

		this._map.on({
			contextmenu: this._show,
			mousedown: this._hide,
			movestart: this._hide,
			zoomstart: this._hide
		}, this);
	},

	removeHooks: function () {
        var container = this._map.getContainer();

		L.DomEvent
            .off(container, 'mouseleave', this._hide, this)
			.off(document, 'keydown', this._onKeyDown, this);

        if (L.Browser.touch) {
            L.DomEvent.off(document, this._touchstart, this._hide, this);
        }

		this._map.off({
			contextmenu: this._show,
			mousedown: this._hide,
			movestart: this._hide,
			zoomstart: this._hide
		}, this);
	},

	showAt: function (point, data) {
		if (point instanceof L.LatLng) {
			point = this._map.latLngToContainerPoint(point);
		}
		this._showAtPoint(point, data);
	},

	hide: function () {
		this._hide();
	},

	addItem: function (options) {
		return this.insertItem(options);
	},

	insertItem: function (options, index) {
		index = index !== undefined ? index: this._items.length;

		var item = this._createItem(this._container, options, index);

		this._items.push(item);

		this._sizeChanged = true;

		this._map.fire('contextmenu.additem', {
			contextmenu: this,
			el: item.el,
			index: index
		});

		return item.el;
	},

	removeItem: function (item) {
		var container = this._container;

		if (!isNaN(item)) {
			item = container.children[item];
		}

		if (item) {
			this._removeItem(L.Util.stamp(item));

			this._sizeChanged = true;

			this._map.fire('contextmenu.removeitem', {
				contextmenu: this,
				el: item
			});
		}
	},

	removeAllItems: function () {
		var item;

		while (this._container.children.length) {
			item = this._container.children[0];
			this._removeItem(L.Util.stamp(item));
		}
	},

	hideAllItems: function () {
		var item, i, l;

		for (i = 0, l = this._items.length; i < l; i++) {
			item = this._items[i];
			item.el.style.display = 'none';
		}
	},

	showAllItems: function () {
		var item, i, l;

		for (i = 0, l = this._items.length; i < l; i++) {
			item = this._items[i];
			item.el.style.display = '';
		}
	},

	setDisabled: function (item, disabled) {
		var container = this._container,
		itemCls = L.Map.ContextMenu.BASE_CLS + '-item';

		if (!isNaN(item)) {
			item = container.children[item];
		}

		if (item && L.DomUtil.hasClass(item, itemCls)) {
			if (disabled) {
				L.DomUtil.addClass(item, itemCls + '-disabled');
				this._map.fire('contextmenu.disableitem', {
					contextmenu: this,
					el: item
				});
			} else {
				L.DomUtil.removeClass(item, itemCls + '-disabled');
				this._map.fire('contextmenu.enableitem', {
					contextmenu: this,
					el: item
				});
			}
		}
	},

	isVisible: function () {
		return this._visible;
	},

	_createItems: function () {
		var itemOptions = this._map.options.contextmenuItems,
		    item,
		    i, l;

		for (i = 0, l = itemOptions.length; i < l; i++) {
			this._items.push(this._createItem(this._container, itemOptions[i]));
		}
	},

	_createItem: function (container, options, index) {
		if (options.separator || options === '-') {
			return this._createSeparator(container, index);
		}

		var itemCls = L.Map.ContextMenu.BASE_CLS + '-item',
		    cls = options.disabled ? (itemCls + ' ' + itemCls + '-disabled') : itemCls,
		    el = this._insertElementAt('a', cls, container, index),
		    callback = this._createEventHandler(el, options.callback, options.context, options.hideOnSelect),
		    html = '';

		if (options.icon) {
			html = '<img class="' + L.Map.ContextMenu.BASE_CLS + '-icon" src="' + options.icon + '"/>';
		} else if (options.iconCls) {
			html = '<span class="' + L.Map.ContextMenu.BASE_CLS + '-icon ' + options.iconCls + '"></span>';
		}

		el.innerHTML = html + options.text;
		el.href = '#';

		L.DomEvent
			.on(el, 'mouseover', this._onItemMouseOver, this)
			.on(el, 'mouseout', this._onItemMouseOut, this)
			.on(el, 'mousedown', L.DomEvent.stopPropagation)
			.on(el, 'click', callback);

		return {
			id: L.Util.stamp(el),
			el: el,
			callback: callback
		};
	},

	_removeItem: function (id) {
		var item,
		    el,
		    i, l, callback;

		for (i = 0, l = this._items.length; i < l; i++) {
			item = this._items[i];

			if (item.id === id) {
				el = item.el;
				callback = item.callback;

				if (callback) {
					L.DomEvent
						.off(el, 'mouseover', this._onItemMouseOver, this)
						.off(el, 'mouseover', this._onItemMouseOut, this)
						.off(el, 'mousedown', L.DomEvent.stopPropagation)
						.off(el, 'click', callback);
				}

				this._container.removeChild(el);
				this._items.splice(i, 1);

				return item;
			}
		}
		return null;
	},

	_createSeparator: function (container, index) {
		var el = this._insertElementAt('div', L.Map.ContextMenu.BASE_CLS + '-separator', container, index);

		return {
			id: L.Util.stamp(el),
			el: el
		};
	},

	_createEventHandler: function (el, func, context, hideOnSelect) {
		var me = this,
		    map = this._map,
		    disabledCls = L.Map.ContextMenu.BASE_CLS + '-item-disabled',
		    _hideOnSelect = (hideOnSelect !== undefined) ? hideOnSelect : true;

		return function (e) {
			if (L.DomUtil.hasClass(el, disabledCls)) {
				return;
			}

			if (_hideOnSelect) {
				me._hide();
			}

			if (func) {
				func.call(context || map, me._showLocation);
			}

			me._map.fire('contextmenu:select', {
				contextmenu: me,
				el: el
			});
		};
	},

	_insertElementAt: function (tagName, className, container, index) {
		var refEl,
		    el = document.createElement(tagName);

		el.className = className;

		if (index !== undefined) {
			refEl = container.children[index];
		}

		if (refEl) {
			container.insertBefore(el, refEl);
		} else {
			container.appendChild(el);
		}

		return el;
	},

	_show: function (e) {
		this._showAtPoint(e.containerPoint, e);
	},

	_showAtPoint: function (pt, data) {
		if (this._items.length) {
			var map = this._map,
			layerPoint = map.containerPointToLayerPoint(pt),
			latlng = map.layerPointToLatLng(layerPoint),
			event = L.extend(data || {}, {contextmenu: this});

			this._showLocation = {
				latlng: latlng,
				layerPoint: layerPoint,
				containerPoint: pt
			};

			if(data && data.relatedTarget){
				this._showLocation.relatedTarget = data.relatedTarget;
			}

			this._setPosition(pt);

			if (!this._visible) {
				this._container.style.display = 'block';
				this._visible = true;
			} else {
				this._setPosition(pt);
			}

			this._map.fire('contextmenu.show', event);
		}
	},

	_hide: function () {
		if (this._visible) {
			this._visible = false;
			this._container.style.display = 'none';
			this._map.fire('contextmenu.hide', {contextmenu: this});
		}
	},

	_setPosition: function (pt) {
		var mapSize = this._map.getSize(),
		    container = this._container,
		    containerSize = this._getElementSize(container),
		    anchor;

		if (this._map.options.contextmenuAnchor) {
			anchor = L.point(this._map.options.contextmenuAnchor);
			pt = pt.add(anchor);
		}

		container._leaflet_pos = pt;

		if (pt.x + containerSize.x > mapSize.x) {
			container.style.left = 'auto';
			container.style.right = Math.max(mapSize.x - pt.x, 0) + 'px';
		} else {
			container.style.left = Math.max(pt.x, 0) + 'px';
			container.style.right = 'auto';
		}

		if (pt.y + containerSize.y > mapSize.y) {
			container.style.top = 'auto';
			container.style.bottom = Math.max(mapSize.y - pt.y, 0) + 'px';
		} else {
			container.style.top = Math.max(pt.y, 0) + 'px';
			container.style.bottom = 'auto';
		}
	},

	_getElementSize: function (el) {
		var size = this._size,
		    initialDisplay = el.style.display;

		if (!size || this._sizeChanged) {
			size = {};

			el.style.left = '-999999px';
			el.style.right = 'auto';
			el.style.display = 'block';

			size.x = el.offsetWidth;
			size.y = el.offsetHeight;

			el.style.left = 'auto';
			el.style.display = initialDisplay;

			this._sizeChanged = false;
		}

		return size;
	},

	_onKeyDown: function (e) {
		var key = e.keyCode;

		// If ESC pressed and context menu is visible hide it
		if (key === 27) {
			this._hide();
		}
	},

	_onItemMouseOver: function (e) {
		L.DomUtil.addClass(e.target || e.srcElement, 'over');
	},

	_onItemMouseOut: function (e) {
		L.DomUtil.removeClass(e.target || e.srcElement, 'over');
	}
});

L.Map.addInitHook('addHandler', 'contextmenu', L.Map.ContextMenu);

L.Mixin.ContextMenu = {

	bindContextMenu: function (options) {
		L.setOptions(this, options);
		this._initContextMenu();

		return this;
	},

	unbindContextMenu: function (){
		this.off('contextmenu', this._showContextMenu, this);

		return this;
	},

	addContextMenuItem: function (item) {
			this.options.contextmenuItems.push(item);
	},

	removeContextMenuItemWithIndex: function (index) {
		  var items = [];
			for (var i = 0; i < this.options.contextmenuItems.length; i++) {
					if(this.options.contextmenuItems[i].index == index){
							items.push(i);
					}
			}
			var elem = items.pop();
			while (elem !== undefined) {
				  this.options.contextmenuItems.splice(elem,1);
					elem = items.pop();
		  }
	},

	replaceConextMenuItem: function (item) {
		  this.removeContextMenuItemWithIndex(item.index);
		  this.addContextMenuItem(item);
	},

	_initContextMenu: function () {
		this._items = [];

		this.on('contextmenu', this._showContextMenu, this);
	},

	_showContextMenu: function (e) {
		var itemOptions,
		    data, pt, i, l;

		if (this._map.contextmenu) {
            data = L.extend({relatedTarget: this}, e);

			pt = this._map.mouseEventToContainerPoint(e.originalEvent);

			if (!this.options.contextmenuInheritItems) {
				this._map.contextmenu.hideAllItems();
			}

			for (i = 0, l = this.options.contextmenuItems.length; i < l; i++) {
				itemOptions = this.options.contextmenuItems[i];
				this._items.push(this._map.contextmenu.insertItem(itemOptions, itemOptions.index));
			}

			this._map.once('contextmenu.hide', this._hideContextMenu, this);

			this._map.contextmenu.showAt(pt, data);
		}
	},

	_hideContextMenu: function () {
		var i, l;

		for (i = 0, l = this._items.length; i < l; i++) {
			this._map.contextmenu.removeItem(this._items[i]);
		}
		this._items.length = 0;

		if (!this.options.contextmenuInheritItems) {
			this._map.contextmenu.showAllItems();
		}
	}
};

var classes = [L.Marker, L.Path],
    defaultOptions = {
		contextmenu: false,
		contextmenuItems: [],
	    contextmenuInheritItems: true
	},
    cls, i, l;

for (i = 0, l = classes.length; i < l; i++) {
	cls = classes[i];

	// L.Class should probably provide an empty options hash, as it does not test
	// for it here and add if needed
	if (!cls.prototype.options) {
		cls.prototype.options = defaultOptions;
	} else {
		cls.mergeOptions(defaultOptions);
	}

	cls.addInitHook(function () {
		if (this.options.contextmenu) {
			this._initContextMenu();
		}
	});

	cls.include(L.Mixin.ContextMenu);
}

	return L.Map.ContextMenu;
	});

L.TrackLayer = function() {
  var aislayer = L.featureGroup([]);

  this.addTrack = function(marker) {
    marker.addTo(aislayer);
  };

  this.removeTrack = function(marker) {
    marker.removeLayer(aislayer);
  };


  this.addTo = function(map) {
    aislayer.addTo(map);
  };
};

L.trackLayer = function() {
  return new L.TrackLayer();
};


/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Tim Leerhoff <tleerhof@web.de>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


/**
 * Tracksymbol for leaflet.
 * The visualization is chosen by zoomlevel or heading availability.
 * If zoomlevel is smaller than 'minSilouetteZoom' a triangular symbol is rendered.
 * If zoomlevel is greater than 'minSilouetteZoom' a ship silouette is rendered.
 * If heading is undefined a diamond symbol is rendered.
 * The following options are available:
 * <ul>
 *   <li>trackId: The unique id of the symbol (default: 0). </li>
 *   <li>size: Static size of the symbol in pixels (default:24). </li>
 *   <li>heading: Initial heading of the symbol (default: undefined). </li>
 *   <li>course: Initial course of the symbol (default: undefined). </li>
 *   <li>speed: Initial speed of the symbol-leader (default: undefined). </li>
 *   <li>leaderTime: The length of the leader (speed * leaderTime) (default:60s). </li>
 *   <li>minSilouetteZoom: The zoomlevel to switch from triangle to silouette (default:14). </li>
 *   <li>gpsRefPos: Initial GPS offset of the symbol (default: undefined). </li>
 *   <li>defaultSymbol: The triangular track symbol. Contains an array of n numbers. [x1,y1,x2,y2,...] </li>
 *   <li>noHeadingSymbol: The diamond track symbol. Contains an array of n numbers. [x1,y1,x2,y2,...] </li>
 *   <li>silouetteSymbol: The ship track symbol. Contains an array of n numbers. [x1,y1,x2,y2,...] </li>
 * </ul>
 * @class TrackSymbol
 * @constructor
 * @param latlng {LanLng} The initial position of the symbol.
 * @param options {Object} The initial options described above.
 */
L.TrackSymbol = L.Path.extend({

  initialize: function (latlng, options) {
    L.setOptions(this, options);
    if(latlng === undefined) {
      throw Error('Please give a valid lat/lon-position');
    }
    options = options || {};
    this._id = options.trackId || 0;
    this._leaflet_id = this._id; 
    this._latlng = L.latLng(latlng);
    this._size = options.size || 24;
    this._heading = options.heading;
    this._course = options.course;
    this._speed = options.speed;
    this._leaderTime = options.leaderTime || 60.0;
    this._minSilouetteZoom = options.minSilouetteZoom || 14;
    this.setGPSRefPos(options.gpsRefPos);
    this._triSymbol = options.defaultSymbol || [0.75,0, -0.25,0.3, -0.25,-0.3];
    this._diaSymbol = options.noHeadingSymbol || [0.3,0, 0,0.3, -0.3,0, 0,-0.3];
    this._silSymbol = options.silouetteSymbol || [1,0.5, 0.75,1, 0,1, 0,0, 0.75,0];
  },

  /**
   * This function is empty but necessary 
   * because it is called during the rendering process of Leaflet v1.0.
   * @method _project
   */
  _project: function(){
  },

  /**
   * Update the path
   * This function is called during the rendering process of leaflet v1.0
   * @method _update
   */
  _update: function(){
    this._setPath();
  },

  /**
   * Sets the contents of the d-attribute in a path-element of an svg-file.  
   * @method _setPath
   */
  _setPath: function(){
    this._path.setAttribute('d',this.getPathString());
  },

  /**
   * Set the default symbol.
   * @method setDefaultSymbol
   * @param symbol {Array} The corner points of the symbol. 
   */
  setDefaultSymbol: function (symbol) {
    this._triSymbol = symbol;
    return this.redraw();
  },

  /**
   * Set the symbol for tracks with no heading.
   * @method setNoHeadingSymbol
   * @param symbol {Array} The corner points of the symbol. 
   */
  setNoHeadingSymbol: function (symbol) {
    this._diaSymbol = symbol;
    return this.redraw();
  },

  /**
   * Set the symbol for tracks with shown silouette.
   * @method setSilouetteSymbol
   * @param symbol {Array} The corner points of the symbol. 
   */
  setSilouetteSymbol: function (symbol) {
    this._silSymbol = symbol;
    return this.redraw();
  },
  
  /**
   * Set latitude/longitude on the symbol.
   * @method setLatLng
   * @param latlng {LatLng} Position of the symbol on the map. 
   */
  setLatLng: function (latlng) {
    var oldLatLng = this._latlng;
    this._latlng = L.latLng(latlng);
    this.fire('move', {oldLatLng: oldLatLng, latlng: this._latlng});
    return this.redraw();
  },
  
  /**
   * Set the speed shown in the symbol [m/s].
   * The leader-length is calculated via leaderTime.
   * @method setSpeed
   * @param speed {Number} The speed in [m/s]. 
   */
  setSpeed: function( speed ) {
    this._speed = speed;
    return this.redraw();
  },
  
  /**
   * Sets the course over ground [rad].
   * The speed-leader points in this direction.
   * @method setCourse
   * @param course {Number} The course in radians.
   */
  setCourse: function( course ) {
    this._course = course;
    return this.redraw();
  },
  
  /**
   * Sets the heading of the symbol [rad].
   * The heading rotates the symbol.
   * @method setHeading
   * @param course {Number} The heading in radians.
   */
  setHeading: function( heading ) {
    this._heading = heading;
    return this.redraw();
  },
  
  /**
   * Sets the leaderTime of the symbol [seconds].
   * @method setLeaderTime
   * @param leaderTime {Number} The leaderTime in seconds.
   */
  setLeaderTime: function( leaderTime ) {
    this._leaderTime = leaderTime;
    return this.redraw();
  },

  /**
   * Sets the position offset of the silouette to the center of the symbol.
   * The array contains the refpoints from ITU R-REC-M.1371-4-201004 page 108
   * in sequence A,B,C,D.
   * @method setGPSRefPos
   * @param gpsRefPos {Array} The GPS offset from center.
   */
  setGPSRefPos: function(gpsRefPos) {
    if(gpsRefPos === undefined || 
       gpsRefPos.length < 4) {
      this._gpsRefPos = undefined;
    }
    else if(gpsRefPos[0] === 0 && 
            gpsRefPos[1] === 0 && 
            gpsRefPos[2] === 0 && 
            gpsRefPos[3] === 0) {
      this._gpsRefPos = undefined;
    }
    else {
      this._gpsRefPos = gpsRefPos;
    }
    return this.redraw();
  },

  /**
   * Returns the trackId.
   * @method getTrackId
   * @return {Number} The track id.
   */
  getTrackId: function() {
    return this._Id;
  },
    
  _getLatSize: function () {
    return this._getLatSizeOf(this._size);
  },

  _getLngSize: function () {
    return this._getLngSizeOf(this._size);
  },
  
  _getLatSizeOf: function (value) {
    return (value / 40075017) * 360;
  },

  _getLngSizeOf: function (value) {
    return ((value / 40075017) * 360) / Math.cos((Math.PI/180) * this._latlng.lat);
  },

  /**
   * Returns the bounding box of the symbol.
   * @method getBounds
   * @return {LatLngBounds} The bounding box.
   */
  getBounds: function () {
     var lngSize = this._getLngSize() / 2.0;
     var latSize = this._getLatSize() / 2.0;
     var latlng = this._latlng;
     return new L.LatLngBounds(
            [latlng.lat - latSize, latlng.lng - lngSize],
            [latlng.lat + latSize, latlng.lng + lngSize]);
  },

  /**
   * Returns the position of the symbol on the map.
   * @mathod getLatLng
   * @return {LatLng} The position object.
   */
  getLatLng: function () {
    return this._latlng;
  },

  //
  // Rotates the given point around the angle.
  // @method _rotate
  // @param point {Array} A point vector 2d.
  // @param angle {Number} Angle for rotation [rad].
  // @return The rotated vector 2d.
  //
  _rotate: function(point, angle) {
    var x = point[0];
    var y = point[1];
    var si_z = Math.sin(angle);
    var co_z = Math.cos(angle);
    var newX = x * co_z - y * si_z;
    var newY = x * si_z + y * co_z;
    return [newX, newY];
  },

  //
  // Rotates the given point-array around the angle.
  // @method _rotateAllPoints
  // @param points {Array} A point vector 2d.
  // @param angle {Number} Angle for rotation [rad].
  // @return The rotated vector-array 2d.
  //
  _rotateAllPoints: function(points, angle) {
    var result = [];
    for(var i=0;i<points.length;i+=2) {
      var x = points[i + 0] * this._size;
      var y = points[i + 1] * this._size;
      var pt = this._rotate([x, y], angle);
      result.push(pt[0]);
      result.push(pt[1]);
    }
    return result;
  },

  _createLeaderViewPoints: function(angle) {
    var result = [];
    var leaderLength = this._speed * this._leaderTime;
    var leaderEndLng = this._latlng.lng + this._getLngSizeOf(leaderLength * Math.cos(angle));
    var leaderEndLat = this._latlng.lat + this._getLatSizeOf(leaderLength * Math.sin(angle));
    var endPoint = this._map.latLngToLayerPoint(L.latLng([leaderEndLat, leaderEndLng]));
    var startPoint = this._map.latLngToLayerPoint(this._latlng);
    return [startPoint.x, startPoint.y, endPoint.x, endPoint.y];
  },

  _transformAllPointsToView: function(points) {
    var result = [];
    var symbolViewCenter = this._map.latLngToLayerPoint(this._latlng);
    for(var i=0;i<points.length;i+=2) {
      var x = symbolViewCenter.x + points[i+0];
      var y = symbolViewCenter.y - points[i+1];
      result.push(x);
      result.push(y);
    }
    return result;
  },

  _createPathFromPoints: function(points) {
    var result;
    for(var i=0;i<points.length;i+=2) {
      var x = points[i+0];
      var y = points[i+1];
      if(result === undefined)
        result = 'M ' + x + ' ' + y + ' ';
      else
        result += 'L ' + x + ' ' + y + ' ';
    }
    return result + ' Z';
  },

  _getViewAngleFromModel:  function(modelAngle) {
    return Math.PI/2.0 - modelAngle;
  },

  _createNoHeadingSymbolPathString: function() {
    var viewPoints = this._transformAllPointsToView( this._rotateAllPoints(this._diaSymbol, 0.0) );
    var viewPath = this._createPathFromPoints(viewPoints);
    if( this._course !== undefined && this._speed !== undefined ) {
      var courseAngle = this._getViewAngleFromModel(this._course);
      var leaderPoints = this._createLeaderViewPoints(courseAngle);
      viewPath += '' + this._createPathFromPoints(leaderPoints);
    }
    return viewPath;
  },

  _createWithHeadingSymbolPathString: function() {
    var headingAngle = this._getViewAngleFromModel(this._heading);
    var viewPoints = this._transformAllPointsToView( this._rotateAllPoints(this._triSymbol, headingAngle) );
    var viewPath = this._createPathFromPoints(viewPoints);
    if( this._course !== undefined && this._speed !== undefined ) {
      var courseAngle = this._getViewAngleFromModel(this._course);
      var leaderPoints = this._createLeaderViewPoints(courseAngle);
      viewPath += '' + this._createPathFromPoints(leaderPoints);
    }
    return viewPath;
  },

  _resizeAndMovePoint: function(point, size, offset) {
    return [
      point[0] * size[0] + offset[0], 
      point[1] * size[1] + offset[1]
    ];
  },

  _getSizeFromGPSRefPos: function() {
    return [
      this._gpsRefPos[0] + this._gpsRefPos[1],
      this._gpsRefPos[2] + this._gpsRefPos[3]
    ];
  },

  _getOffsetFromGPSRefPos: function() {
    return [
      -this._gpsRefPos[1], 
      -this._gpsRefPos[3]
    ];
  },

  _transformSilouetteSymbol: function() {
    var headingAngle = this._getViewAngleFromModel(this._heading);
    var result = [];
    var size = this._getSizeFromGPSRefPos();
    var offset = this._getOffsetFromGPSRefPos();
    for(var i=0;i<this._silSymbol.length;i+=2) {
      var pt = [
        this._silSymbol[i+0], 
        this._silSymbol[i+1]
      ];
      pt = this._resizeAndMovePoint(pt, size, offset);
      pt = this._rotate(pt, headingAngle);
      var pointLng = this._latlng.lng + this._getLngSizeOf(pt[0]);
      var pointLat = this._latlng.lat + this._getLatSizeOf(pt[1]);
      var viewPoint = this._map.latLngToLayerPoint(L.latLng([pointLat, pointLng]));
      result.push(viewPoint.x);
      result.push(viewPoint.y);
    }
    return result;
  },

  _createSilouetteSymbolPathString: function() {
    var silouettePoints = this._transformSilouetteSymbol();
    var viewPath = this._createPathFromPoints(silouettePoints);
    if( this._course !== undefined && this._speed !== undefined ) {
      var courseAngle = this._getViewAngleFromModel(this._course);
      var leaderPoints = this._createLeaderViewPoints(courseAngle);
      viewPath += '' + this._createPathFromPoints(leaderPoints);
    }
    return viewPath;
  },

  /**
   * Generates the symbol as SVG path string.
   * depending on zoomlevel or track heading different symbol types are generated.
   * @return {String} The symbol path string.
   */
  getPathString: function () {
    if(this._heading === undefined) {
      return this._createNoHeadingSymbolPathString();
    }
    else {
      if(this._gpsRefPos === undefined || this._map.getZoom() <= this._minSilouetteZoom ) {
        return this._createWithHeadingSymbolPathString();
      }
      else {
        return this._createSilouetteSymbolPathString();
      }
    }
  }
});

/**
 * Factory function to create the symbol.
 * @method trackSymbol
 * @param latlng {LatLng} The position on the map.
 * @param options {Object} Additional options. 
 */
L.trackSymbol = function (latlng, options) {
    return new L.TrackSymbol(latlng, options);
};


/**
 * Created by Johannes Rudolph <johannes.rudolph@gmx.com> on 16.02.2016.
 */

/**
 *
 */
L.AISTrackSymbolLayer = L.FeatureGroup.extend({

    /**
     *
     * @param layers
     */
    initialize: function(layers,iconListByTypeOfShip){
        L.LayerGroup.prototype.initialize.call(this, layers);
        this._intervalDeadObjs = setInterval(this._checkDeadObjects,1000,this);
        this.setRemoveTime(10);
        if(iconListByTypeOfShip !== undefined){
            this._iconListByTypeOfShip = iconListByTypeOfShip;
        }
    },

    /**
     *
     * @param mmsi
     * @param data
     */
    addAisData: function(data){
        var mmsi = data.mmsi;
        var trackMarker;
        if(this.getLayer(mmsi)){
            trackMarker = this.getLayer(mmsi);
            trackMarker.addData(data);
        }
        else{
            var options = {
                contextmenu: true,
                contextmenuItems: [{
                    text: 'Details',
                    callback: this.showDetails,
                    index: 0
                }, {
                    text: 'MarineTraffic.com',
                    callback: this.openMarineTraffic,
                    index: 1
                },{
                    separator: true,
                    index: 2
                }]};
            if(this._iconListByTypeOfShip !== undefined){
                options.iconListByTypeOfShip = this._iconListByTypeOfShip;
            }
            trackMarker = L.aisTrackSymbol( options );
            trackMarker.addData(data);
            this.addLayer(trackMarker);
        }
    },

    /**
     *
     * @param e
     */
    openMarineTraffic: function (e) {
        e.relatedTarget.openMarineTraffic();
    },

    /**
     *
     * @param e
     */
    showDetails: function (e) {
        e.relatedTarget.openPopup();
    },

    /**
     *
     * @param layerGroup
     * @private
     */
    _checkDeadObjects: function(layerGroup) {
        var now = new Date();
        layerGroup.eachLayer(function(layer){
            if((now - layer.getLastUpdate()) > (layerGroup.getRemoveTime() * 60 * 1000 ))
                layerGroup.removeLayer(layer);
        });
    },

    /**
     *
     * @param searchText
     * @returns {*}
     */
    searchTrack: function (searchText) {
        for(var i = 0 ; i < this.getLayers().length; i++){
            var obj = this.getLayers()[i];
            if(obj.getMmsi() === parseInt(searchText,10)){
                return obj;
            }
            if(obj.getName().toLowerCase() === searchText.toLowerCase()){
                return obj;
            }
            if(obj.getImoNumber() === parseInt(searchText)){
                return obj;
            }
        }
        return false;
    },

    /**
     *
     * @param minutes
     */
    setRemoveTime: function(minutes){
        this._removeMinutes = minutes;
    },

    /**
     *
     * @returns {*}
     */
    getRemoveTime: function(){
        return this._removeMinutes;
    }
});

/**
 *
 * @returns {*}
 */
L.aisTrackSymbolLayer = function() {
    return new L.AISTrackSymbolLayer();
};
/**
 * Created by Johannes Rudolph <johannes.rudolph@gmx.de> on 14.11.2017.
 */


/**
 *
 * @param options
 * @returns {*}
 */
L.aisTrackSymbol = function (options) {
    if(options.iconListByTypeOfShip) {
        return new L.AISTrackSymbolMarker(options);
    }
    else {
        return new L.AISTrackSymbolPath(options);
    }
};


/**
 * Created by Johannes Rudolph <johannes.rudolph@gmx.de> on 14.11.2017.
 */

/**
 *
 */
L.AISTrackSymbolMarker = L.Marker.extend({

    /**
     *
     * @param options
     */
    initialize: function (options) {
        L.Marker.prototype.initialize.call(this,L.latLng(options.latitude,options.longitude) , options);

        this._leaderTime = 360;
        options.course = options.cog || 0;
        this._iconListByTypeOfShip = options.iconListByTypeOfShip;

        this.setName(options.name || "");

        this.bindPopup("",{className: "ais-track-popup"});
        this.bindTooltip();

        this.addData(options);
    },

    /**
     *
     * @param aisData
     */
    addData: function(aisData){
        this.setMmsi(aisData.mmsi);
        this.setMsgId(aisData.aisMsgId);
        if(aisData.navigationStatus) this.setNavigationStatus(aisData.navigationStatus);

        if(aisData.positionAccuracy) this.setPositionAccuracy(aisData.positionAccuracy);
        if(aisData.latitude) this.setLatitude(aisData.latitude);
        if(aisData.longitude) this.setLongitude(aisData.longitude);

        if(this.getLatitude() && this.getLongitude()) this.setLatLng(L.latLng(this.getLatitude(), this.getLongitude()));

        if(aisData.rot) this.setRot(aisData.rot);
        if(aisData.sog) this.setSog(aisData.sog);
        if(aisData.trueHeading) this.setTrueHeading(aisData.trueHeading);
        if(aisData.timeStamp) this.setTimeStamp(aisData.timeStamp);
        if(aisData.specialManoeuvreIndicator) this.setSpecialManoeuvreIndicator(aisData.specialManoeuvreIndicator);
        if(aisData.raimFlag) this.setRaimFlag(aisData.raimFlag);
        if(aisData.communicationState) this.setCommunicationState(aisData.communicationState);
        if(aisData.aisVersionIndicator) this.setAisVersionIndicator(aisData.aisVersionIndicator);
        if(aisData.imoNumber) this.setImoNumber(aisData.imoNumber);
        if(aisData.callSign) this.setCallSign(aisData.callSign);
        if(aisData.name) this.setName(aisData.name);
        if(aisData.typeOfShipAndCargo) this.setTypeOfShipAndCargo(aisData.typeOfShipAndCargo);
        if(aisData.referencePositionA) this.setReferencePositionA(aisData.referencePositionA);
        if(aisData.referencePositionB) this.setReferencePositionB(aisData.referencePositionB);
        if(aisData.referencePositionC) this.setReferencePositionC(aisData.referencePositionC);
        if(aisData.referencePositionC) this.setReferencePositionD(aisData.referencePositionD);
        if(aisData.typeOfDevice) this.setTypeOfDevice(aisData.typeOfDevice);
        if(aisData.eta) this.setEta(aisData.eta);
        if(aisData.maxPresentStaticDraught) this.setMaxPresentStaticDraught(aisData.maxPresentStaticDraught);
        if(aisData.destination) this.setDestination(aisData.destination);
        if(aisData.dte) this.setDte(aisData.dte);
        if(aisData.cog) this.setCog(aisData.cog);      
        if(this.getReferencePositions()) this.setGPSRefPos(this.getReferencePositions());
        if(aisData.typeOfAtoN) this.setTypeOfAtoN(aisData.typeOfAtoN);
        if(aisData.nameOfAtoN) this.setName(aisData.nameOfAtoN);
        if(aisData.virtualAtoNFlag) this.setVirtualAtoNFlag(aisData.virtualAtoNFlag);
        if(aisData.assignedModeFlag) this.setAssignedModeFlag(aisData.assignedModeFlag); 
        if(aisData.utcYear) this.setUTCYear(aisData.utcYear);
        if(aisData.utcMonth) this.setUTCMonth(aisData.utcMonth);
        if(aisData.utcDay) this.setUTCDay(aisData.utcDay);
        if(aisData.utcHour) this.setUTCHour(aisData.utcHour);
        if(aisData.utcMinute) this.setUTCMinute(aisData.utcMinute);
        if(aisData.utcSecond) this.setUTCSecond(aisData.utcSecond);
        this.setNameByMMSITable();
        this.setLastUpdate();
        this.labelAndPopupUpdate();
    },

    /**
     *
     * @private
     */
    labelAndPopupUpdate: function (){
        this.setTooltipContent(this.getMmsi() + " " + this.getName());
        if(this.getPopup()){
            this.getPopup().setContent(this.getPopupContent());
        }
    },

    /**
     *
     * @returns {string}
     * @private
     */
    getPopupContent: function() {

        var content = L.DomUtil.create('div');

        var headerText = this.getName().length !== 0  ? this.getName() : "MSSI: " + this.getMmsi();
        var header = L.DomUtil.create('div','ais-popup-header',content);
        header.innerHTML = headerText;

        var popupContent = L.DomUtil.create('div','ais-popup-content',content);

        var table = "<table>";
        table += this.getTableRow("MSSI",this.getMmsi());

        if(this.getName())                      table += this.getTableRow("Name",this.getName());
        if(this.getImoNumber())                 table += this.getTableRow("IMO",this.getImoNumber());
        if(this.getCallSign())                  table += this.getTableRow("Callsign",this.getCallSign());
        if(this.getSog())                       table += this.getTableRow("Speed",this.getSog()," kn | " + this.getSogKmH() + " km/h ");
        if(this.getCogDeg())                    table += this.getTableRow("Course",this.getCogDeg(),"&deg;");
        if(this.getTrueHeadingDeg())            table += this.getTableRow("Heading",this.getTrueHeadingDeg(),"&deg;");
        if(this.getDestination())               table += this.getTableRow("Destination",this.getDestination());
        if(this.getEta())                       table += this.getTableRow("ETA",moment(this.getEta()).format('llll'));
        if(this.getNavigationStatusText())      table += this.getTableRow("Nav. Status",this.getNavigationStatusText());
        if(this.getShipLength())                table += this.getTableRow("Length",this.getShipLength()," m");
        if(this.getShipWidth())                 table += this.getTableRow("Width",this.getShipWidth()," m");
        if(this.getTypeOfShipText())            table += this.getTableRow("TypeOfShip",this.getTypeOfShipText());
        if(this.getMaxPresentStaticDraught())   table += this.getTableRow("Draught",this.getMaxPresentStaticDraught()," m");

        if(this.getTypeOfDeviceText())          table += this.getTableRow("TypeOfDevice",this.getTypeOfDeviceText());
        if(this.getUTCTime())                   table += this.getTableRow("Time",moment(this.getUTCTime()).format('LTS'));

        if(this.getTypeOfAtoNText())            table += this.getTableRow("TypeOfAtoN",this.getTypeOfAtoNText());
        if(this.getVirtualAtoNFlagText())       table += this.getTableRow("VirtualAtoN",this.getVirtualAtoNFlagText());
        if(this.getAssignedModeFlagText())      table += this.getTableRow("AssignedMode",this.getAssignedModeFlagText());

        table += this.getTableRow("Last AIS Message",moment(this.getLastUpdate()).format('LTS'));

        table += "</table>";

        popupContent.innerHTML = table;

        var footer = L.DomUtil.create('div','ais-popup-footer',content);
        footer.innerHTML = "More Details on <a href='http://www.marinetraffic.com/en/ais/details/ships/mmsi:"+this.getMmsi()+"' target='_blank'>MarineTraffic.com</a>";

        return content;
    },

    getPopup: function () {
        return this._popup;
    },

    /**
     * Open Ship Detials from MarineTraffic in a new Tab/Window
     */
    openMarineTraffic: function () {
        var win = window.open("http://www.marinetraffic.com/en/ais/details/ships/mmsi:"+this.getMmsi(), '_blank');
        win.focus();
    },

    /**
     *
     * @param title
     * @param content
     * @param unit
     * @returns {*}
     */
    getTableRow: function(title,content,unit){
        if(!unit)
            unit = "";
        if(content)
            return  "<tr>" +
                "<td>" + title+  "</td>" +
                "<td>" + content + unit + "</td>" +
                "</tr>";
        return "";
    },

    /**
     *
     * @private
     */
    setNameByMMSITable: function(){
        if (typeof MMSI !== 'undefined')
            if(MMSI[this.getMmsi()])
                this.setName(MMSI[this.getMmsi()]);
    },

    /**
     *
     * @returns {*}
     */
    getMsgId: function(){
        return this._msgId;
    },

    /**
     *
     * @param msgId
     */
    setMsgId: function(msgId){
        this._msgId = msgId;
    },

    /**
     *
     * @returns {*}
     */
    getMmsi: function(){
        return this._mmsi;
    },

    /**
     *
     * @param mmsi
     */
    setMmsi: function(mmsi){
        this._mmsi = mmsi;
        this._leaflet_id = mmsi;
    },

    /**
     *
     * @returns {*|number}
     */
    getAisVersionIndicator: function(){
        return this._aisVersionIndicator;
    },

    /**
     *
     * @param aisVersionIndicator
     */
    setAisVersionIndicator: function(aisVersionIndicator){
        this._aisVersionIndicator = aisVersionIndicator;
    },

    /**
     *
     * @returns {*}
     */
    getImoNumber: function() {
        return this._imoNumber;
    },

    /**
     *
     * @param imoNumber
     */
    setImoNumber: function(imoNumber){
        this._imoNumber = imoNumber;
    },

    /**
     *
     * @returns {*|string}
     */
    getCallSign: function(){
        return this._callSign;
    },

    /**
     *
     * @param callSign
     */
    setCallSign: function(callSign){
        this._callSign = callSign;
    },

    /**
     *
     * @returns {*|string}
     */
    getName: function(){
        return this._name;
    },

    /**
     *
     * @param name
     */
    setName: function(name){
        this._name = name;
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfShipAndCargo: function(){
        return this._typeOfShipAndCargo;
    },

    /**
     *
     * @param typeOfShipAndCargo
     */
    setTypeOfShipAndCargo: function(typeOfShipAndCargo){
        this._typeOfShipAndCargo = typeOfShipAndCargo;
        this._setIconByTypeOfShip();
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfAtoN: function(){
        return this._typeOfAtoN;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfAtoNText: function(){
        //this._setColorByTypeOfAtoN();
        switch (this.getTypeOfAtoN()){
            case 0:
                return "Default, Type of AtoN not specified";
            case 1:
                return "Reference point";
            case 2:
                return "RACON";
            case 3:
                return "Fixed structures off-shore";
            case 4:
                return "Emergency Wreck Marking Buoy";
            case 5:
                return "Light, without sectors";
            case 6:
                return "Light, with sectors";
            case 7:
                return "Leading Light Front";
            case 8:
                return "Leading Light Rear";
            case 9:
                return "Beacon, Cardinal N";
            case 10:
                return "Beacon, Cardinal E";
            case 11:
                return "Beacon, Cardinal S";
            case 12:
                return "Beacon, Cardinal W";
            case 13:
                return "Beacon, Port hand";
            case 14:
                return "Beacon, Starboard hand";
            case 15:
                return "Beacon, Preferred Channel port hand";            
            case 16:
                return "Beacon, Preferred Channel starboard hand";
            case 17:
                return "Beacon, Isolated danger";
            case 18:
                return "Beacon, Safe water";
            case 19:
                return "Beacon, Special mark";
            case 20:
                return "Cardinal Mark N";
            case 21:
                return "Cardinal Mark E";
            case 22:
                return "Cardinal Mark S";
            case 23:
                return "Cardinal Mark W";
            case 24:
                return "Port hand Mark";
            case 25:
                return "Starboard hand Mark";
            case 26:
                return "Preferred Channel Port hand";
            case 27:
                return "Preferred Channel Starboard hand";
            case 28:
                return "Isolated danger";
            case 29:
                return "Safe Water";
            case 30:
                return "Special Mark";
            case 31:
                return "Light Vessel/LANBY/Rigs";
        }
    },

    /**
     *
     * @param typeOfAtoN
     */
    setTypeOfAtoN: function(typeOfAtoN){
        this._typeOfAtoN = typeOfAtoN;        
    },

    /**
     *
     * @returns {*}
     */
    getNameOfAtoN: function(){
        return this._nameOfAtoN;
    },

    /**
     *
     * @param virtualAtoNFlag
     */
    setVirtualAtoNFlag: function(virtualAtoNFlag){
        this._virtualAtoNFlag = virtualAtoNFlag;        
    },

    /**
     *
     * @returns {*|number}
     */
    getVirtualAtoNFlag: function(){
        return this._virtualAtoNFlag;
    },

    /**
     *
     * @returns {*}
     */
    getVirtualAtoNFlagText: function(){        
        switch (this.getVirtualAtoNFlag()){
            case 0:
                return "real AtoN at indicated position";
            case 1:
                return "virtual AtoN, does not physically exist";            
        }
    },

    /**
     *
     * @param assignedModeFlag
     */
    setAssignedModeFlag: function(assignedModeFlag){
        this._assignedModeFlag = assignedModeFlag;        
    },

    /**
     *
     * @returns {*}
     */
    getAssignedModeFlag: function(){
        return this._assignedModeFlag;
    },

    /**
     *
     * @returns {*}
     */
    getAssignedModeFlagText: function(){        
        switch (this.getAssignedModeFlag()){
            case 0:
                return "Station operating in autonomous and continuous mode";
            case 1:
                return "Station operating in assigned mode";            
        }
    },

    /**
     *
     * @param nameOfAtoN
     */
    setNameOfAtoN: function(nameOfAtoN){
        this._nameOfAtoN = nameOfAtoN;
    },

    /**
     *
     * @param utcYear
     */
    setUTCYear: function(utcYear){
        this._utcYear = utcYear;        
    },

    /**
     *
     * @returns {*}
     */
    getUTCYear: function(){
        return this._utcYear;
    },

    /**
     *
     * @param utcMonth
     */
    setUTCMonth: function(utcMonth){
        if (utcMonth >= 10)
            this._utcMonth = utcMonth;
        else
            this._utcMonth = "0" + utcMonth;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCMonth: function(){
        return this._utcMonth;
    },

    /**
     *
     * @param utcDay
     */
    setUTCDay: function(utcDay){
        if (utcDay >= 10)
            this._utcDay = utcDay;
        else
            this._utcDay = "0" + utcDay;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCDay: function(){
        return this._utcDay;
    },

    /**
     *
     * @param utcHour
     */
    setUTCHour: function(utcHour){
        if (utcHour >= 10)
            this._utcHour = utcHour; 
        else
            this._utcHour = "0" + utcHour;               
    },

    /**
     *
     * @returns {*}
     */
    getUTCHour: function(){
        return this._utcHour;
    },

    /**
     *
     * @param utcMinute
     */
    setUTCMinute: function(utcMinute){
        if (utcMinute >= 10)
            this._utcMinute = utcMinute;
        else
            this._utcMinute = "0" + utcMinute;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCMinute: function(){
        return this._utcMinute;
    },

    /**
     *
     * @param utcSecond
     */
    setUTCSecond: function(utcSecond){
        if (utcSecond >= 10)
            this._utcSecond = utcSecond;
        else
            this._utcSecond = "0" + utcSecond;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCSecond: function(){
        return this._utcSecond;
    },

    /**
     *
     * @returns {string}
     */
    getUTCTime: function(){
        if (typeof this.getUTCYear() === 'undefined')
            return null;
        return new Date(Date.UTC(this.getUTCYear(),this.getUTCMonth(),this.getUTCDay(),this.getUTCHour(),this.getUTCMinute(),this.getUTCSecond()));
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfDevice: function(){
        return this._typeOfDevice;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfDeviceText: function(){
        //this._setColorByTypeOfDevice();
        switch (this.getTypeOfDevice()){
            case 0:
                return "undefined (default)";
            case 1:
                return "global positioning system (GPS)";
            case 2:
                return "GNSS (GLONASS)";
            case 3:
                return "combined GPS/GLONASS";
            case 4:
                return "Loran-C";
            case 5:
                return "Chayka";
            case 6:
                return "integrated navigation system";
            case 7:
                return "surveyed";
            case 8:
                return "Galileo";
            case 9:
            case 10:                
            case 11:                
            case 12:                
            case 13:                
            case 14:                
            case 15:
                return "internal GNSS";
        }
    },

    /**
     *
     * @param typeOfDevice
     */
    setTypeOfDevice: function(typeOfDevice){
        this._typeOfDevice = typeOfDevice;        
    },

    /**
     *
     * @returns {*}
     */
    getEta: function(){
        return this._eta;
    },

    /**
     *
     * @param eta
     */
    setEta: function(eta){
        this._eta = eta;
    },

    /**
     *
     * @returns {*}
     */
    getMaxPresentStaticDraught: function(){
        return this._maxPresentStaticDraught;
    },

    /**
     *
     * @param maxPresentStaticDraught
     */
    setMaxPresentStaticDraught: function(maxPresentStaticDraught){
        this._maxPresentStaticDraught = maxPresentStaticDraught;
    },

    /**
     *
     * @returns {*|string|boolean}
     */
    getDestination: function(){
        return this._destination;
    },

    /**
     *
     * @param destination
     */
    setDestination: function(destination){
        if(destination.length === 0)
            destination = false;
        this._destination = destination;
    },

    /**
     *
     * @returns {*|number}
     */
    getDte: function(){
        return this._dte;
    },

    /**
     *
     * @param dte
     */
    setDte: function(dte){
        this._dte = dte;
    },

    /**
     *
     * @returns {*|number}
     */
    getNavigationStatus: function(){
        return this._navigationStatus;
    },

    /**
     *
     * @returns {*}
     */
    getNavigationStatusText: function(){
        switch (this.getNavigationStatus()){
            case 0:
                return "under way using engine";
            case 1:
                return "at anchor";
            case 2:
                return "not under command";
            case 3:
                return "restricted manoeuvrability";
            case 4:
                return "constrained by her draught";
            case 5:
                return "moored";
            case 6:
                return "aground";
            case 7:
                return "engaged in fishing";
            case 8:
                return "under way sailing";
            case 9:
            case 10:                
            case 11:
                return "power-driven vessel towing astern";
            case 12:
                return "power-driven vessel pushing ahead or towing alongside";
            case 13:
                return "reserved for future use";
            case 14:
                return "AIS-SART (active)";
            case 15:
                return "undefined"; //also used by AIS-SART, MOB-AIS and EPIRB-AIS under test
        }
    },

    /**
     *
     * @param navigationStatus
     */
    setNavigationStatus: function(navigationStatus){
        this._navigationStatus = navigationStatus;
    },

    /**
     *
     * @returns {*|number}
     */
    getRot: function(){
        return this._rot;
    },

    /**
     *
     * @param rot
     */
    setRot: function(rot){
        this._rot = rot;
    },

    /**
     *
     * @returns {string}
     */
    getSogKmH: function(){
        var speedKmH = this._sog * 1.852;
        return speedKmH.toFixed(1);
    },

    /**
     *
     * @returns {*|number}
     */
    getSog: function(){
        return this._sog;
    },

    /**
     *
     * @param sog
     */
    setSog: function(sog){
        this._sog = sog;
        this.setSpeed(sog);
    },

    /**
     *
     * @returns {*}
     */
    getPositionAccuracy: function(){
        return this._positionAccuracy;
    },

    /**
     *
     * @param positionAccuracy
     */
    setPositionAccuracy: function(positionAccuracy){
        this._positionAccuracy = positionAccuracy;
    },

    /**
     *
     * @returns {*|Number|number}
     */
    getLatitude: function(){
        return this._latitude;
    },

    /**
     *
     * @param lat
     */
    setLatitude: function(lat){
        this._latitude = parseFloat(lat);
    },

    /**
     *
     * @returns {*|Number|number}
     */
    getLongitude: function(){
        return this._longitude;
    },

    /**
     *
     * @param lng
     */
    setLongitude: function(lng){
        this._longitude = parseFloat(lng);
    },

    /**
     *
     */
    getLatLng: function(){
        return L.latLng(this.getLatitude(),this.getLongitude());
    },

    /**
     *
     * @returns {*}
     */
    getCog: function(){
        return this._cog;
    },

    /**
     *
     * @returns {number}
     */
    getCogDeg: function(){
        return Math.round(this.getCog() * (180/Math.PI));
    },

    /**
     *
     * @param cog
     */
    setCog: function(cog){
        this._cog = cog;
        this.setCourse(cog);
    },

    /**
     *
     * @returns {AISDecoder._transformation.trueHeading|{UNDEFINED, degToMsg, msgToDeg, msgToRad}|*|number}
     */
    getTrueHeading: function(){
        return this._trueHeading;
    },

    /**
     *
     * @returns {number}
     */
    getTrueHeadingDeg: function(){
        return Math.round(this.getTrueHeading() * (180/Math.PI));
    },

    /**
     *
     * @param trueHeading
     */
    setTrueHeading: function(trueHeading){
        this._trueHeading = trueHeading;
        this.setHeading(trueHeading);
    },

    /**
     *
     * @returns {*}
     */
    getTimeStamp: function(){
        return this._timeStamp;
    },

    /**
     *
     * @param timeStamp
     */
    setTimeStamp: function(timeStamp){
        this._timeStamp = timeStamp;
    },

    /**
     *
     * @returns {*}
     */
    getSpecialManoeuvreIndicator: function(){
        return this._specialManoeuvreIndicator;
    },

    /**
     *
     * @param specialManoeuvreIndicator
     */
    setSpecialManoeuvreIndicator: function(specialManoeuvreIndicator){
        this._specialManoeuvreIndicator = specialManoeuvreIndicator;
    },

    /**
     *
     * @returns {*}
     */
    getRaimFlag: function(){
        return this._raimFlag;
    },

    /**
     *
     * @param raimFlag
     */
    setRaimFlag: function(raimFlag){
        this._raimFlag = raimFlag;
    },

    /**
     *
     * @returns {*}
     */
    getCommunicationState: function(){
        return this._communicationState;
    },

    /**
     *
     * @param communicationState
     */
    setCommunicationState: function(communicationState){
        this._communicationState = communicationState;
    },

    /**
     *
     * @returns {*}
     */
    getReferencePositions: function(){
        return (this.getReferencePositionA() && this.getReferencePositionB() && this.getReferencePositionC() && this.getReferencePositionD()) ? [this.getReferencePositionA(),this.getReferencePositionB() ,this.getReferencePositionC() , this.getReferencePositionD()] : false;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionA: function(){
        return this._referencePositionA;
    },

    /**
     *
     * @param referencePositionA
     */
    setReferencePositionA: function(referencePositionA){
        this._referencePositionA = referencePositionA;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionB: function(){
        return this._referencePositionB;
    },

    /**
     *
     * @param referencePositionB
     */
    setReferencePositionB: function(referencePositionB){
        this._referencePositionB = referencePositionB;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionC: function(){
        return this._referencePositionC;
    },

    /**
     *
     * @param referencePositionC
     */
    setReferencePositionC: function(referencePositionC){
        this._referencePositionC = referencePositionC;
    },

    /**
     *
     * @returns {*}
     */
    getReferencePositionD: function(){
        return this._referencePositionD;
    },

    /**
     *
     * @param referencePositionD
     */
    setReferencePositionD: function(referencePositionD){
        this._referencePositionD = referencePositionD;
    },

    getShipLength: function(){
        return this._referencePositionA + this._referencePositionB;
    },

    /**
     *
     * @returns {*}
     */
    getShipWidth: function(){
        return this._referencePositionC + this._referencePositionD;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfShipText: function(){
        switch (this.getTypeOfShipAndCargo()){
            case 0:
                return "NOT AVAILABLE OR NO SHIP";
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
                return "RESERVED";
            case 20:
                return "Wing In Grnd";
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
                return "Wing In Grnd";
            case 30:
                return "Fishing";
            case 31:
            case 32:
                return "Tug";
            case 33:
                return "Dredger";
            case 34:
                return "Dive Vessel";
            case 35:
                return "Military Ops";
            case 36:
                return "Sailing Vessel";
            case 37:
                return "Pleasure Craft";
            case 38:
            case 39:
                return "RESERVED";
            case 40:
            case 41:
            case 42:
            case 43:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
                return "High-Speed Craft";
            case 50:
                return "Pilot Vessel";
            case 51:
                return "SAR";
            case 52:
                return "Tug";
            case 53:
                return "Port Tender";
            case 54:
                return "Anti-Pollution";
            case 55:
                return "Law Enforce";
            case 56:
            case 57:
                return "Local Vessel";
            case 58:
                return "Medical Trans";
            case 59:
                return "Special Craft";
            case 60:
            case 61:
            case 62:
            case 63:
            case 64:
            case 65:
            case 66:
            case 67:
            case 68:
            case 69:
                return "Passenger";
            case 70:
                return "Cargo";
            case 71:
                return "Cargo - Hazard A";
            case 72:
                return "Cargo - Hazard B";
            case 73:
                return "Cargo - Hazard C";
            case 74:
                return "Cargo - Hazard D";
            case 75:
            case 76:
            case 77:
            case 78:
            case 79:
                return "Cargo";
            case 80:
                return "Tanker";
            case 81:
                return "Tanker - Hazard A";
            case 82:
                return "Tanker - Hazard B";
            case 83:
                return "Tanker - Hazard C";
            case 84:
                return "Tanker - Hazard D";
            case 85:
            case 86:
            case 87:
            case 88:
            case 89:
                return "Tanker";
            case 90:
            case 91:
            case 92:
            case 93:
            case 94:
            case 95:
            case 96:
            case 97:
            case 98:
            case 99:
                return "Other";
            default:
                return "Other";
        }
    },


    _setIconByTypeOfShip: function(){
        var icon = this._iconListByTypeOfShip[0];
        if(this._iconListByTypeOfShip[this.getTypeOfShipAndCargo()]){
            icon = this._iconListByTypeOfShip[this.getTypeOfShipAndCargo()];
        }
        this.setIcon(icon);
    },

    /**
     *
     * @returns {Date}
     */
    getLastUpdate: function(){
        return this._lastUpdate;
    },

    /**
     *
     */
    setLastUpdate: function(){
        this._lastUpdate = new Date();
    },

    /**
     *
     * @returns {Array}
     * @private
     */
    getLeafletVersion: function () {
        return L.version.split(".");
    }

});


/**
 * Created by Johannes Rudolph <johannes.rudolph@gmx.de> on 10.02.2016.
 */

/**
 *
 */
L.AISTrackSymbolPath = L.TrackSymbol.extend({

    /**
     *
     * @param options
     */
    initialize: function (options) {
        L.TrackSymbol.prototype.initialize.call(this,L.latLng(0.0,0.0) , options);
        options = options || {};

        this.setFill(options.fill || true);
        this.setFillColor(options.fillColor || '#d3d3d3');
        this.setFillOpacity(options.fillOpacity || 1.0);
        this.setStroke(options.stroke || true);
        this.setColor(options.color || '#000000');
        this.setOpacity(options.opacity || 1.0);
        this.setWeight(options.weight || 1.0);
        this._leaderTime = 360;
        options.course = options.cog || 0;

        this.setName(options.name || "");

        this.bindPopup("",{className: "ais-track-popup"});
        this.bindTooltip();

        this.addData(options);
    },

    /**
     *
     * @param aisData
     */
    addData: function(aisData){
        this.setMmsi(aisData.mmsi);
        this.setMsgId(aisData.aisMsgId);
        if(aisData.navigationStatus) this.setNavigationStatus(aisData.navigationStatus);

        if(aisData.positionAccuracy) this.setPositionAccuracy(aisData.positionAccuracy);
        if(aisData.latitude) this.setLatitude(aisData.latitude);
        if(aisData.longitude) this.setLongitude(aisData.longitude);

        if(this.getLatitude() && this.getLongitude()) this.setLatLng(L.latLng(this.getLatitude(), this.getLongitude()));

        if(aisData.rot) this.setRot(aisData.rot);
        if(aisData.sog) this.setSog(aisData.sog);
        if(aisData.trueHeading) this.setTrueHeading(aisData.trueHeading);
        if(aisData.timeStamp) this.setTimeStamp(aisData.timeStamp);
        if(aisData.specialManoeuvreIndicator) this.setSpecialManoeuvreIndicator(aisData.specialManoeuvreIndicator);
        if(aisData.raimFlag) this.setRaimFlag(aisData.raimFlag);
        if(aisData.communicationState) this.setCommunicationState(aisData.communicationState);
        if(aisData.aisVersionIndicator) this.setAisVersionIndicator(aisData.aisVersionIndicator);
        if(aisData.imoNumber) this.setImoNumber(aisData.imoNumber);
        if(aisData.callSign) this.setCallSign(aisData.callSign);
        if(aisData.name) this.setName(aisData.name);
        if(aisData.typeOfShipAndCargo) this.setTypeOfShipAndCargo(aisData.typeOfShipAndCargo);
        if(aisData.referencePositionA) this.setReferencePositionA(aisData.referencePositionA);
        if(aisData.referencePositionB) this.setReferencePositionB(aisData.referencePositionB);
        if(aisData.referencePositionC) this.setReferencePositionC(aisData.referencePositionC);
        if(aisData.referencePositionC) this.setReferencePositionD(aisData.referencePositionD);
        if(aisData.typeOfDevice) this.setTypeOfDevice(aisData.typeOfDevice);
        if(aisData.eta) this.setEta(aisData.eta);
        if(aisData.maxPresentStaticDraught) this.setMaxPresentStaticDraught(aisData.maxPresentStaticDraught);
        if(aisData.destination) this.setDestination(aisData.destination);
        if(aisData.dte) this.setDte(aisData.dte);
        if(aisData.cog) this.setCog(aisData.cog);      
        if(this.getReferencePositions()) this.setGPSRefPos(this.getReferencePositions());
        if(aisData.typeOfAtoN) this.setTypeOfAtoN(aisData.typeOfAtoN);
        if(aisData.nameOfAtoN) this.setName(aisData.nameOfAtoN);
        if(aisData.virtualAtoNFlag) this.setVirtualAtoNFlag(aisData.virtualAtoNFlag);
        if(aisData.assignedModeFlag) this.setAssignedModeFlag(aisData.assignedModeFlag); 
        if(aisData.utcYear) this.setUTCYear(aisData.utcYear);
        if(aisData.utcMonth) this.setUTCMonth(aisData.utcMonth);
        if(aisData.utcDay) this.setUTCDay(aisData.utcDay);
        if(aisData.utcHour) this.setUTCHour(aisData.utcHour);
        if(aisData.utcMinute) this.setUTCMinute(aisData.utcMinute);
        if(aisData.utcSecond) this.setUTCSecond(aisData.utcSecond);
        this.setNameByMMSITable();
        this.setLastUpdate();
        this.labelAndPopupUpdate();
    },

    /**
     *
     * @private
     */
    labelAndPopupUpdate: function (){
        this.setTooltipContent(this.getMmsi() + " " + this.getName());
        if(this.getPopup()){
            this.getPopup().setContent(this.getPopupContent());
        }
    },

    /**
     *
     * @returns {string}
     * @private
     */
    getPopupContent: function() {

        var content = L.DomUtil.create('div');

        var headerText = this.getName().length !== 0  ? this.getName() : "MSSI: " + this.getMmsi();
        var header = L.DomUtil.create('div','ais-popup-header',content);
        header.innerHTML = headerText;

        var popupContent = L.DomUtil.create('div','ais-popup-content',content);

        var table = "<table>";
        table += this.getTableRow("MSSI",this.getMmsi());

        if(this.getName())                      table += this.getTableRow("Name",this.getName());
        if(this.getImoNumber())                 table += this.getTableRow("IMO",this.getImoNumber());
        if(this.getCallSign())                  table += this.getTableRow("Callsign",this.getCallSign());
        if(this.getSog())                       table += this.getTableRow("Speed",this.getSog()," kn | " + this.getSogKmH() + " km/h ");
        if(this.getCogDeg())                    table += this.getTableRow("Course",this.getCogDeg(),"&deg;");
        if(this.getTrueHeadingDeg())            table += this.getTableRow("Heading",this.getTrueHeadingDeg(),"&deg;");
        if(this.getDestination())               table += this.getTableRow("Destination",this.getDestination());
        if(this.getEta())                       table += this.getTableRow("ETA",moment(this.getEta()).format('llll'));
        if(this.getNavigationStatusText())      table += this.getTableRow("Nav. Status",this.getNavigationStatusText());
        if(this.getShipLength())                table += this.getTableRow("Length",this.getShipLength()," m");
        if(this.getShipWidth())                 table += this.getTableRow("Width",this.getShipWidth()," m");
        if(this.getTypeOfShipText())            table += this.getTableRow("TypeOfShip",this.getTypeOfShipText());
        if(this.getMaxPresentStaticDraught())   table += this.getTableRow("Draught",this.getMaxPresentStaticDraught()," m");

        if(this.getTypeOfDeviceText())          table += this.getTableRow("TypeOfDevice",this.getTypeOfDeviceText());
        if(this.getUTCTime())                   table += this.getTableRow("Time",moment(this.getUTCTime()).format('LTS'));

        if(this.getTypeOfAtoNText())            table += this.getTableRow("TypeOfAtoN",this.getTypeOfAtoNText());
        if(this.getVirtualAtoNFlagText())       table += this.getTableRow("VirtualAtoN",this.getVirtualAtoNFlagText());
        if(this.getAssignedModeFlagText())      table += this.getTableRow("AssignedMode",this.getAssignedModeFlagText());

        table += this.getTableRow("Last AIS Message",moment(this.getLastUpdate()).format('LTS'));

        table += "</table>";

        popupContent.innerHTML = table;

        var footer = L.DomUtil.create('div','ais-popup-footer',content);
        footer.innerHTML = "More Details on <a href='http://www.marinetraffic.com/en/ais/details/ships/mmsi:"+this.getMmsi()+"' target='_blank'>MarineTraffic.com</a>";

        return content;
    },

    getPopup: function () {
        return this._popup;
    },

    /**
     * Open Ship Detials from MarineTraffic in a new Tab/Window
     */
    openMarineTraffic: function () {
        var win = window.open("http://www.marinetraffic.com/en/ais/details/ships/mmsi:"+this.getMmsi(), '_blank');
        win.focus();
    },

    /**
     *
     * @param title
     * @param content
     * @param unit
     * @returns {*}
     */
    getTableRow: function(title,content,unit){
        if(!unit)
            unit = "";
        if(content)
            return  "<tr>" +
                "<td>" + title+  "</td>" +
                "<td>" + content + unit + "</td>" +
                "</tr>";
        return "";
    },

    /**
     *
     * @private
     */
    _setColorByTypeOfDevice: function(){
        this.setColor("#61380b");
        this.setFillColor("#ffffff");
    },

    /**
     *
     * @private
     */
    _setColorByTypeOfAtoN: function(){
        this.setColor("#61380b");
        this.setFillColor("#CEF6CE");
    },

    /**
     *
     * @private
     */
    setNameByMMSITable: function(){
        if (typeof MMSI !== 'undefined')
            if(MMSI[this.getMmsi()])
                this.setName(MMSI[this.getMmsi()]);
    },

    /**
     *
     * @private
     */
    _setColorsByTypeOfShip: function(){
        switch (this.getTypeOfShipAndCargo()){
            case 0: //NOT AVAILABLE OR NO SHIP
                this.setColor("#000000");
                this.setFillColor("#d3d3d3");
                break;
            case 1: //RESERVED               
            case 2: //RESERVED
            case 3: //RESERVED
            case 4: //RESERVED
            case 5: //RESERVED
            case 6: //RESERVED
            case 8: //RESERVED
            case 9: //RESERVED
            case 10: //RESERVED
            case 11: //RESERVED
            case 12: //RESERVED
            case 13: //RESERVED
            case 14: //RESERVED
            case 15: //RESERVED
            case 16: //RESERVED
            case 17: //RESERVED
            case 18: //RESERVED
            case 19: //RESERVED
                this.setColor("#000000");
                this.setFillColor("#d3d3d3");
                break;
            case 20: //Wing In Grnd
            case 21: //Wing In Grnd
            case 22: //Wing In Grnd
            case 23: //Wing In Grnd
            case 24: //Wing In Grnd
            case 25: //Wing In Grnd
            case 26: //Wing In Grnd
            case 27: //Wing In Grnd
            case 28: //Wing In Grnd
                this.setColor("#000000");
                this.setFillColor("#d3d3d3");
                break;
            case 29: //SAR AIRCRAFT
                this.setColor("#000000");
                this.setFillColor("#d3d3d3");
                break;
            case 30: //Fishing
                this.setColor("#800000");
                this.setFillColor("#ffa07a");
                break;
            case 31: //Tug
            case 32: //Tug
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 33: //Dredger
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 34: //Dive Vessel
            case 35: //Military Ops
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 36: //Sailing Vessel
                this.setColor("#8b008b");
                this.setFillColor("#ff00ff");
                break;
            case 37: //Pleasure Craft
                this.setColor("#8b008b");
                this.setFillColor("#ff00ff");
                break;
            case 38: //RESERVED
            case 39: //RESERVED
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 40: //High-Speed Craft
            case 41: //High-Speed Craft
            case 42: //High-Speed Craft
            case 43: //High-Speed Craft
            case 44: //High-Speed Craft
            case 45: //High-Speed Craft
            case 46: //High-Speed Craft
            case 47: //High-Speed Craft
            case 48: //High-Speed Craft
            case 49: //High-Speed Craft
                this.setColor("#00008b");
                this.setFillColor("#ffff00");
                break;
            case 50: //Pilot Vessel
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 51: //SAR
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 52: //Tug
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 53: //Port Tender
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 54: //Anti-Pollution
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 55: //Law Enforce
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 56: //Local Vessel
            case 57: //Local Vessel
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 58: //Medical Trans (as defined in the 1949 Geneva Conventions and Additional Protocols)
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 59: //Special Craft
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            case 60: //Passenger
            case 61: //Passenger
            case 62: //Passenger
            case 63: //Passenger
            case 64: //Passenger
            case 65: //Passenger
            case 66: //Passenger
            case 67: //Passenger
            case 68: //Passenger
            case 69: //Passenger
                this.setColor("#00008b");
                this.setFillColor("#0000ff");
                break;
            case 70: //Cargo
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 71: //Cargo - Hazard A
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 72: //Cargo - Hazard B
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 73: //Cargo - Hazard C
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 74: //Cargo - Hazard D
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 75: //Cargo
            case 76: //Cargo
            case 77: //Cargo
            case 78: //Cargo
            case 79: //Cargo
                this.setColor("#006400");
                this.setFillColor("#90ee90");
                break;
            case 80: //Tanker
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 81: //Tanker - Hazard A
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 82: //Tanker - Hazard B
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 83: //Tanker - Hazard C
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 84: //Tanker - Hazard D
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 85: //Tanker
            case 86: //Tanker
            case 87: //Tanker
            case 88: //Tanker
            case 89: //Tanker
                this.setColor("#8b0000");
                this.setFillColor("#ff0000");
                break;
            case 90: //Other
            case 91: //Other
            case 92: //Other
            case 93: //Other
            case 94: //Other
            case 95: //Other
            case 96: //Other
            case 97: //Other
            case 98: //Other
            case 99: //Other
                this.setColor("#008b8b");
                this.setFillColor("#00ffff");
                break;
            default: //Default
                this.setColor("#000000");
                this.setFillColor("#d3d3d3");
        }
    },

    /**
     *
     * @returns {*}
     */
    getMsgId: function(){
        return this._msgId;
    },

    /**
     *
     * @param msgId
     */
    setMsgId: function(msgId){
        this._msgId = msgId;
    },

    /**
     *
     * @returns {*}
     */
    getMmsi: function(){
        return this._mmsi;
    },

    /**
     *
     * @param mmsi
     */
    setMmsi: function(mmsi){
        this._mmsi = mmsi;
        this._leaflet_id = mmsi;
    },

    /**
     *
     * @returns {*|number}
     */
    getAisVersionIndicator: function(){
        return this._aisVersionIndicator;
    },

    /**
     *
     * @param aisVersionIndicator
     */
    setAisVersionIndicator: function(aisVersionIndicator){
        this._aisVersionIndicator = aisVersionIndicator;
    },

    /**
     *
     * @returns {*}
     */
    getImoNumber: function() {
        return this._imoNumber;
    },

    /**
     *
     * @param imoNumber
     */
    setImoNumber: function(imoNumber){
        this._imoNumber = imoNumber;
    },

    /**
     *
     * @returns {*|string}
     */
    getCallSign: function(){
        return this._callSign;
    },

    /**
     *
     * @param callSign
     */
    setCallSign: function(callSign){
        this._callSign = callSign;
    },

    /**
     *
     * @returns {*|string}
     */
    getName: function(){
        return this._name;
    },

    /**
     *
     * @param name
     */
    setName: function(name){
        this._name = name;
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfShipAndCargo: function(){
        return this._typeOfShipAndCargo;
    },

    /**
     *
     * @param typeOfShipAndCargo
     */
    setTypeOfShipAndCargo: function(typeOfShipAndCargo){
        this._typeOfShipAndCargo = typeOfShipAndCargo;
        this._setColorsByTypeOfShip();
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfAtoN: function(){
        return this._typeOfAtoN;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfAtoNText: function(){
        //this._setColorByTypeOfAtoN();
        switch (this.getTypeOfAtoN()){
            case 0:
                return "Default, Type of AtoN not specified";
            case 1:
                return "Reference point";
            case 2:
                return "RACON";
            case 3:
                return "Fixed structures off-shore";
            case 4:
                return "Emergency Wreck Marking Buoy";
            case 5:
                return "Light, without sectors";
            case 6:
                return "Light, with sectors";
            case 7:
                return "Leading Light Front";
            case 8:
                return "Leading Light Rear";
            case 9:
                return "Beacon, Cardinal N";
            case 10:
                return "Beacon, Cardinal E";
            case 11:
                return "Beacon, Cardinal S";
            case 12:
                return "Beacon, Cardinal W";
            case 13:
                return "Beacon, Port hand";
            case 14:
                return "Beacon, Starboard hand";
            case 15:
                return "Beacon, Preferred Channel port hand";            
            case 16:
                return "Beacon, Preferred Channel starboard hand";
            case 17:
                return "Beacon, Isolated danger";
            case 18:
                return "Beacon, Safe water";
            case 19:
                return "Beacon, Special mark";
            case 20:
                return "Cardinal Mark N";
            case 21:
                return "Cardinal Mark E";
            case 22:
                return "Cardinal Mark S";
            case 23:
                return "Cardinal Mark W";
            case 24:
                return "Port hand Mark";
            case 25:
                return "Starboard hand Mark";
            case 26:
                return "Preferred Channel Port hand";
            case 27:
                return "Preferred Channel Starboard hand";
            case 28:
                return "Isolated danger";
            case 29:
                return "Safe Water";
            case 30:
                return "Special Mark";
            case 31:
                return "Light Vessel/LANBY/Rigs";
        }
    },

    /**
     *
     * @param typeOfAtoN
     */
    setTypeOfAtoN: function(typeOfAtoN){
        this._typeOfAtoN = typeOfAtoN;        
    },

    /**
     *
     * @returns {*}
     */
    getNameOfAtoN: function(){
        return this._nameOfAtoN;
    },

    /**
     *
     * @param virtualAtoNFlag
     */
    setVirtualAtoNFlag: function(virtualAtoNFlag){
        this._virtualAtoNFlag = virtualAtoNFlag;        
    },

    /**
     *
     * @returns {*|number}
     */
    getVirtualAtoNFlag: function(){
        return this._virtualAtoNFlag;
    },

    /**
     *
     * @returns {*}
     */
    getVirtualAtoNFlagText: function(){        
        switch (this.getVirtualAtoNFlag()){
            case 0:
                return "real AtoN at indicated position";
            case 1:
                return "virtual AtoN, does not physically exist";            
        }
    },

    /**
     *
     * @param assignedModeFlag
     */
    setAssignedModeFlag: function(assignedModeFlag){
        this._assignedModeFlag = assignedModeFlag;        
    },

    /**
     *
     * @returns {*}
     */
    getAssignedModeFlag: function(){
        return this._assignedModeFlag;
    },

    /**
     *
     * @returns {*}
     */
    getAssignedModeFlagText: function(){        
        switch (this.getAssignedModeFlag()){
            case 0:
                return "Station operating in autonomous and continuous mode";
            case 1:
                return "Station operating in assigned mode";            
        }
    },

    /**
     *
     * @param nameOfAtoN
     */
    setNameOfAtoN: function(nameOfAtoN){
        this._nameOfAtoN = nameOfAtoN;
    },

    /**
     *
     * @param utcYear
     */
    setUTCYear: function(utcYear){
        this._utcYear = utcYear;        
    },

    /**
     *
     * @returns {*}
     */
    getUTCYear: function(){
        return this._utcYear;
    },

    /**
     *
     * @param utcMonth
     */
    setUTCMonth: function(utcMonth){
        if (utcMonth >= 10)
            this._utcMonth = utcMonth;
        else
            this._utcMonth = "0" + utcMonth;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCMonth: function(){
        return this._utcMonth;
    },

    /**
     *
     * @param utcDay
     */
    setUTCDay: function(utcDay){
        if (utcDay >= 10)
            this._utcDay = utcDay;
        else
            this._utcDay = "0" + utcDay;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCDay: function(){
        return this._utcDay;
    },

    /**
     *
     * @param utcHour
     */
    setUTCHour: function(utcHour){
        if (utcHour >= 10)
            this._utcHour = utcHour; 
        else
            this._utcHour = "0" + utcHour;               
    },

    /**
     *
     * @returns {*}
     */
    getUTCHour: function(){
        return this._utcHour;
    },

    /**
     *
     * @param utcMinute
     */
    setUTCMinute: function(utcMinute){
        if (utcMinute >= 10)
            this._utcMinute = utcMinute;
        else
            this._utcMinute = "0" + utcMinute;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCMinute: function(){
        return this._utcMinute;
    },

    /**
     *
     * @param utcSecond
     */
    setUTCSecond: function(utcSecond){
        if (utcSecond >= 10)
            this._utcSecond = utcSecond;
        else
            this._utcSecond = "0" + utcSecond;
    },

    /**
     *
     * @returns {*|number}
     */
    getUTCSecond: function(){
        return this._utcSecond;
    },

    /**
     *
     * @returns {string}
     */
    getUTCTime: function(){
        if (typeof this.getUTCYear() === 'undefined')
            return null;
        return new Date(Date.UTC(this.getUTCYear(),this.getUTCMonth(),this.getUTCDay(),this.getUTCHour(),this.getUTCMinute(),this.getUTCSecond()));
    },

    /**
     *
     * @returns {*|number}
     */
    getTypeOfDevice: function(){
        return this._typeOfDevice;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfDeviceText: function(){
        //this._setColorByTypeOfDevice();
        switch (this.getTypeOfDevice()){
            case 0:
                return "undefined (default)";
            case 1:
                return "global positioning system (GPS)";
            case 2:
                return "GNSS (GLONASS)";
            case 3:
                return "combined GPS/GLONASS";
            case 4:
                return "Loran-C";
            case 5:
                return "Chayka";
            case 6:
                return "integrated navigation system";
            case 7:
                return "surveyed";
            case 8:
                return "Galileo";
            case 9:
            case 10:                
            case 11:                
            case 12:                
            case 13:                
            case 14:                
            case 15:
                return "internal GNSS";
        }
    },

    /**
     *
     * @param typeOfDevice
     */
    setTypeOfDevice: function(typeOfDevice){
        this._typeOfDevice = typeOfDevice;        
    },

    /**
     *
     * @returns {*}
     */
    getEta: function(){
        return this._eta;
    },

    /**
     *
     * @param eta
     */
    setEta: function(eta){
        this._eta = eta;
    },

    /**
     *
     * @returns {*}
     */
    getMaxPresentStaticDraught: function(){
        return this._maxPresentStaticDraught;
    },

    /**
     *
     * @param maxPresentStaticDraught
     */
    setMaxPresentStaticDraught: function(maxPresentStaticDraught){
        this._maxPresentStaticDraught = maxPresentStaticDraught;
    },

    /**
     *
     * @returns {*|string|boolean}
     */
    getDestination: function(){
        return this._destination;
    },

    /**
     *
     * @param destination
     */
    setDestination: function(destination){
        if(destination.length === 0)
            destination = false;
        this._destination = destination;
    },

    /**
     *
     * @returns {*|number}
     */
    getDte: function(){
        return this._dte;
    },

    /**
     *
     * @param dte
     */
    setDte: function(dte){
        this._dte = dte;
    },

    /**
     *
     * @returns {*|number}
     */
    getNavigationStatus: function(){
        return this._navigationStatus;
    },

    /**
     *
     * @returns {*}
     */
    getNavigationStatusText: function(){
        switch (this.getNavigationStatus()){
            case 0:
                return "under way using engine";
            case 1:
                return "at anchor";
            case 2:
                return "not under command";
            case 3:
                return "restricted manoeuvrability";
            case 4:
                return "constrained by her draught";
            case 5:
                return "moored";
            case 6:
                return "aground";
            case 7:
                return "engaged in fishing";
            case 8:
                return "under way sailing";
            case 9:
            case 10:                
            case 11:
                return "power-driven vessel towing astern";
            case 12:
                return "power-driven vessel pushing ahead or towing alongside";
            case 13:
                return "reserved for future use";
            case 14:
                return "AIS-SART (active)";
            case 15:
                return "undefined"; //also used by AIS-SART, MOB-AIS and EPIRB-AIS under test
        }
    },

    /**
     *
     * @param navigationStatus
     */
    setNavigationStatus: function(navigationStatus){
        this._navigationStatus = navigationStatus;
    },

    /**
     *
     * @returns {*|number}
     */
    getRot: function(){
        return this._rot;
    },

    /**
     *
     * @param rot
     */
    setRot: function(rot){
        this._rot = rot;
    },

    /**
     *
     * @returns {string}
     */
    getSogKmH: function(){
        var speedKmH = this._sog * 1.852;
        return speedKmH.toFixed(1);
    },

    /**
     *
     * @returns {*|number}
     */
    getSog: function(){
        return this._sog;
    },

    /**
     *
     * @param sog
     */
    setSog: function(sog){
        this._sog = sog;
        this.setSpeed(sog);
    },

    /**
     *
     * @returns {*}
     */
    getPositionAccuracy: function(){
        return this._positionAccuracy;
    },

    /**
     *
     * @param positionAccuracy
     */
    setPositionAccuracy: function(positionAccuracy){
        this._positionAccuracy = positionAccuracy;
    },

    /**
     *
     * @returns {*|Number|number}
     */
    getLatitude: function(){
        return this._latitude;
    },

    /**
     *
     * @param lat
     */
    setLatitude: function(lat){
        this._latitude = parseFloat(lat);
    },

    /**
     *
     * @returns {*|Number|number}
     */
    getLongitude: function(){
        return this._longitude;
    },

    /**
     *
     * @param lng
     */
    setLongitude: function(lng){
        this._longitude = parseFloat(lng);
    },

    /**
     *
     */
    getLatLng: function(){
        return L.latLng(this.getLatitude(),this.getLongitude());
    },

    /**
     *
     * @returns {*}
     */
    getCog: function(){
        return this._cog;
    },

    /**
     *
     * @returns {number}
     */
    getCogDeg: function(){
        return Math.round(this.getCog() * (180/Math.PI));
    },

    /**
     *
     * @param cog
     */
    setCog: function(cog){
        this._cog = cog;
        this.setCourse(cog);
    },

    /**
     *
     * @returns {AISDecoder._transformation.trueHeading|{UNDEFINED, degToMsg, msgToDeg, msgToRad}|*|number}
     */
    getTrueHeading: function(){
        return this._trueHeading;
    },

    /**
     *
     * @returns {number}
     */
    getTrueHeadingDeg: function(){
        return Math.round(this.getTrueHeading() * (180/Math.PI));
    },

    /**
     *
     * @param trueHeading
     */
    setTrueHeading: function(trueHeading){
        this._trueHeading = trueHeading;
        this.setHeading(trueHeading);
    },

    /**
     *
     * @returns {*}
     */
    getTimeStamp: function(){
        return this._timeStamp;
    },

    /**
     *
     * @param timeStamp
     */
    setTimeStamp: function(timeStamp){
        this._timeStamp = timeStamp;
    },

    /**
     *
     * @returns {*}
     */
    getSpecialManoeuvreIndicator: function(){
        return this._specialManoeuvreIndicator;
    },

    /**
     *
     * @param specialManoeuvreIndicator
     */
    setSpecialManoeuvreIndicator: function(specialManoeuvreIndicator){
        this._specialManoeuvreIndicator = specialManoeuvreIndicator;
    },

    /**
     *
     * @returns {*}
     */
    getRaimFlag: function(){
        return this._raimFlag;
    },

    /**
     *
     * @param raimFlag
     */
    setRaimFlag: function(raimFlag){
        this._raimFlag = raimFlag;
    },

    /**
     *
     * @returns {*}
     */
    getCommunicationState: function(){
        return this._communicationState;
    },

    /**
     *
     * @param communicationState
     */
    setCommunicationState: function(communicationState){
        this._communicationState = communicationState;
    },

    /**
     *
     * @returns {*}
     */
    getReferencePositions: function(){
        return (this.getReferencePositionA() && this.getReferencePositionB() && this.getReferencePositionC() && this.getReferencePositionD()) ? [this.getReferencePositionA(),this.getReferencePositionB() ,this.getReferencePositionC() , this.getReferencePositionD()] : false;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionA: function(){
        return this._referencePositionA;
    },

    /**
     *
     * @param referencePositionA
     */
    setReferencePositionA: function(referencePositionA){
        this._referencePositionA = referencePositionA;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionB: function(){
        return this._referencePositionB;
    },

    /**
     *
     * @param referencePositionB
     */
    setReferencePositionB: function(referencePositionB){
        this._referencePositionB = referencePositionB;
    },

    /**
     *
     * @returns {*|number}
     */
    getReferencePositionC: function(){
        return this._referencePositionC;
    },

    /**
     *
     * @param referencePositionC
     */
    setReferencePositionC: function(referencePositionC){
        this._referencePositionC = referencePositionC;
    },

    /**
     *
     * @returns {*}
     */
    getReferencePositionD: function(){
        return this._referencePositionD;
    },

    /**
     *
     * @param referencePositionD
     */
    setReferencePositionD: function(referencePositionD){
        this._referencePositionD = referencePositionD;
    },

    getShipLength: function(){
        return this._referencePositionA + this._referencePositionB;
    },

    /**
     *
     * @returns {*}
     */
    getShipWidth: function(){
        return this._referencePositionC + this._referencePositionD;
    },

    /**
     *
     * @returns {*}
     */
    getTypeOfShipText: function(){
        switch (this.getTypeOfShipAndCargo()){
            case 0:
                return "NOT AVAILABLE OR NO SHIP";
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
                return "RESERVED";
            case 20:
                return "Wing In Grnd";
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
                return "Wing In Grnd";
            case 30:
                return "Fishing";
            case 31:
            case 32:
                return "Tug";
            case 33:
                return "Dredger";
            case 34:
                return "Dive Vessel";
            case 35:
                return "Military Ops";
            case 36:
                return "Sailing Vessel";
            case 37:
                return "Pleasure Craft";
            case 38:
            case 39:
                return "RESERVED";
            case 40:
            case 41:
            case 42:
            case 43:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
                return "High-Speed Craft";
            case 50:
                return "Pilot Vessel";
            case 51:
                return "SAR";
            case 52:
                return "Tug";
            case 53:
                return "Port Tender";
            case 54:
                return "Anti-Pollution";
            case 55:
                return "Law Enforce";
            case 56:
            case 57:
                return "Local Vessel";
            case 58:
                return "Medical Trans";
            case 59:
                return "Special Craft";
            case 60:
            case 61:
            case 62:
            case 63:
            case 64:
            case 65:
            case 66:
            case 67:
            case 68:
            case 69:
                return "Passenger";
            case 70:
                return "Cargo";
            case 71:
                return "Cargo - Hazard A";
            case 72:
                return "Cargo - Hazard B";
            case 73:
                return "Cargo - Hazard C";
            case 74:
                return "Cargo - Hazard D";
            case 75:
            case 76:
            case 77:
            case 78:
            case 79:
                return "Cargo";
            case 80:
                return "Tanker";
            case 81:
                return "Tanker - Hazard A";
            case 82:
                return "Tanker - Hazard B";
            case 83:
                return "Tanker - Hazard C";
            case 84:
                return "Tanker - Hazard D";
            case 85:
            case 86:
            case 87:
            case 88:
            case 89:
                return "Tanker";
            case 90:
            case 91:
            case 92:
            case 93:
            case 94:
            case 95:
            case 96:
            case 97:
            case 98:
            case 99:
                return "Other";
            default:
                return "Other";
        }
    },

    /**
     *
     * @returns {Date}
     */
    getLastUpdate: function(){
        return this._lastUpdate;
    },

    /**
     *
     */
    setLastUpdate: function(){
        this._lastUpdate = new Date();
    },

    /**
     * Sets the line color of the symbol.
     * @method setColor
     * @param color {String} The color string.
     */
    setColor: function(color) {
        this.setStyle({color: color});
        return this.redraw();
    },

    /**
     * Sets the fill Opacity of the symbol.
     * @method setFillOpacity
     * @param fillOpacity {Number} The fill opacity.
     */
    setFillOpacity: function(fillOpacity) {
        this.setStyle({fillOpacity: fillOpacity});
        return this.redraw();
    },

    /**
     * Sets the Opacity of the symbol.
     * @method setOpacity
     * @param opacity {Number} The opacity.
     */
    setOpacity: function(opacity) {
        this.setStyle({opacity: opacity});
        return this.redraw();
    },

    /**
     * Sets the Weight of the symbol.
     * @method setWeight
     * @param weight {Number} The weight .
     */
    setWeight: function(weight) {
        this.setStyle({weight: weight});
        return this.redraw();
    },

    /**
     * Sets the fill of the symbol.
     * @method setFill
     * @param fill {Boolean} The fill.
     */
    setFill: function(fill) {
        this.setStyle({fill: fill});
        return this.redraw();
    },

    /**
     * Sets the stroke of the symbol.
     * @method setStroke
     * @param stroke {Boolean} The stroke.
     */
    setStroke: function(stroke) {
        this.setStyle({stroke: stroke});
        return this.redraw();
    },

    /**
     * Sets the fill color of the symbol.
     * @method setFillColor
     * @param color {String} The color string.
     */
    setFillColor: function(color) {
        this.setStyle({fillColor: color});
    },

    /**
     *
     * @returns {Array}
     * @private
     */
    getLeafletVersion: function () {
        return L.version.split(".");
    }

});
