/**
* Copyright (c) 2020, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* uPlot.js (μPlot)
* An exceptionally fast, tiny time series chart
* https://github.com/leeoniya/uPlot (v0.1.0)
*/

'use strict';

var months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December" ];

var days = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday" ];

function slice3(str) {
	return str.slice(0, 3);
}

var days3 = days.map(slice3);

var months3 = months.map(slice3);

function zeroPad2(int) {
	return (int < 10 ? '0' : '') + int;
}

function zeroPad3(int) {
	return (int < 10 ? '00' : int < 100 ? '0' : '') + int;
}

/*
function suffix(int) {
	let mod10 = int % 10;

	return int + (
		mod10 == 1 && int != 11 ? "st" :
		mod10 == 2 && int != 12 ? "nd" :
		mod10 == 3 && int != 13 ? "rd" : "th"
	);
}
*/

var getFullYear = 'getFullYear';
var getMonth = 'getMonth';
var getDate = 'getDate';
var getDay = 'getDay';
var getHours = 'getHours';
var getMinutes = 'getMinutes';
var getSeconds = 'getSeconds';
var getMilliseconds = 'getMilliseconds';

var subs = {
	// 2019
	YYYY:	function (d) { return d[getFullYear](); },
	// 19
	YY:		function (d) { return (d[getFullYear]()+'').slice(2); },
	// July
	MMMM:	function (d) { return months[d[getMonth]()]; },
	// Jul
	MMM:	function (d) { return months3[d[getMonth]()]; },
	// 07
	MM:		function (d) { return zeroPad2(d[getMonth]()+1); },
	// 7
	M:		function (d) { return d[getMonth]()+1; },
	// 09
	DD:		function (d) { return zeroPad2(d[getDate]()); },
	// 9
	D:		function (d) { return d[getDate](); },
	// Monday
	WWWW:	function (d) { return days[d[getDay]()]; },
	// Mon
	WWW:	function (d) { return days3[d[getDay]()]; },
	// 03
	HH:		function (d) { return zeroPad2(d[getHours]()); },
	// 3
	H:		function (d) { return d[getHours](); },
	// 9 (12hr, unpadded)
	h:		function (d) {var h = d[getHours](); return h == 0 ? 12 : h > 12 ? h - 12 : h;},
	// AM
	AA:		function (d) { return d[getHours]() >= 12 ? 'PM' : 'AM'; },
	// am
	aa:		function (d) { return d[getHours]() >= 12 ? 'pm' : 'am'; },
	// a
	a:		function (d) { return d[getHours]() >= 12 ? 'p' : 'a'; },
	// 09
	mm:		function (d) { return zeroPad2(d[getMinutes]()); },
	// 9
	m:		function (d) { return d[getMinutes](); },
	// 09
	ss:		function (d) { return zeroPad2(d[getSeconds]()); },
	// 9
	s:		function (d) { return d[getSeconds](); },
	// 374
	fff:	function (d) { return zeroPad3(d[getMilliseconds]()); },
};

function fmtDate(tpl) {
	var parts = [];

	var R = /\{([a-z]+)\}|[^{]+/yi, m;

	while (m = R.exec(tpl))
		{ parts.push(m[0][0] == '{' ? subs[m[1]] : m[0]); }

	return function (d) {
		var out = '';

		for (var i = 0; i < parts.length; i++)
			{ out += typeof parts[i] == "string" ? parts[i] : parts[i](d); }

		return out;
	}
}

// https://stackoverflow.com/questions/15141762/how-to-initialize-a-javascript-date-to-a-particular-time-zone/53652131#53652131
function tzDate(date, tz) {
	var date2 = new Date(date.toLocaleString('en-US', {timeZone: tz}));
	date2.setMilliseconds(date[getMilliseconds]());
	return date2;
}

function debounce(fn, time) {
	var pending = null;

	function run() {
		pending = null;
		fn();
	}

	return function() {
		clearTimeout(pending);
		pending = setTimeout(run, time);
	}
}

// binary search for index of closest value
function closestIdx(num, arr, lo, hi) {
	var mid;
	lo = lo || 0;
	hi = hi || arr.length - 1;
	var bitwise = hi <= 2147483647;

	while (hi - lo > 1) {
		mid = bitwise ? (lo + hi) >> 1 : floor((lo + hi) / 2);

		if (arr[mid] < num)
			{ lo = mid; }
		else
			{ hi = mid; }
	}

	if (num - arr[lo] <= arr[hi] - num)
		{ return lo; }

	return hi;
}

function getMinMax(data, _i0, _i1) {
//	console.log("getMinMax()");

	var _min = inf;
	var _max = -inf;

	for (var i = _i0; i <= _i1; i++) {
		if (data[i] != null) {
			_min = min(_min, data[i]);
			_max = max(_max, data[i]);
		}
	}

	return [_min, _max];
}

// this ensures that non-temporal/numeric y-axes get multiple-snapped padding added above/below
// TODO: also account for incrs when snapping to ensure top of axis gets a tick & value
function rangeNum(min, max, mult, extra) {
	// auto-scale Y
	var delta = max - min;
	var mag = log10(delta || abs(max) || 1);
	var exp = floor(mag);
	var incr = pow(10, exp) * mult;
	var buf = delta == 0 ? incr : 0;

	var snappedMin = round6(incrRoundDn(min - buf, incr));
	var snappedMax = round6(incrRoundUp(max + buf, incr));

	if (extra) {
		// for flat data, always use 0 as one chart extreme
		if (delta == 0) {
			if (max > 0)
				{ snappedMin = 0; }
			else if (max < 0)
				{ snappedMax = 0; }
		}
		else {
			// if buffer is too small, increase it
			if (snappedMax - max < incr)
				{ snappedMax += incr; }

			if (min - snappedMin < incr)
				{ snappedMin -= incr; }

			// if original data never crosses 0, use 0 as one chart extreme
			if (min >= 0 && snappedMin < 0)
				{ snappedMin = 0; }

			if (max <= 0 && snappedMax > 0)
				{ snappedMax = 0; }
		}
	}

	return [snappedMin, snappedMax];
}

var M = Math;

var abs = M.abs;
var floor = M.floor;
var round = M.round;
var ceil = M.ceil;
var min = M.min;
var max = M.max;
var pow = M.pow;
var log10 = M.log10;
var PI = M.PI;

var inf = Infinity;

function incrRound(num, incr) {
	return round(num/incr)*incr;
}

function clamp(num, _min, _max) {
	return min(max(num, _min), _max);
}

function fnOrSelf(v) {
	return typeof v == "function" ? v : function () { return v; };
}

function retArg2(a, b) {
	return b;
}

function incrRoundUp(num, incr) {
	return ceil(num/incr)*incr;
}

function incrRoundDn(num, incr) {
	return floor(num/incr)*incr;
}

function round2(val) {
	return round(val * 1e2) / 1e2;
}

function round3(val) {
	return round(val * 1e3) / 1e3;
}

function round6(val) {
	return round(val * 1e6) / 1e6;
}

var assign = Object.assign;

var isArr = Array.isArray;

function isStr(v) {
	return typeof v === 'string';
}

function isObj(v) {
	return typeof v === 'object' && v !== null;
}

function copy(o) {
	var out;

	if (isArr(o))
		{ out = o.map(copy); }
	else if (isObj(o)) {
		out = {};
		for (var k in o)
			{ out[k] = copy(o[k]); }
	}
	else
		{ out = o; }

	return out;
}

/*
function isObj(v) {
	return typeof v === 'object' && v !== null;
}

// https://stackoverflow.com/a/34624648
function copy(o) {
	var _out, v, _key;
	_out = Array.isArray(o) ? [] : {};
	for (_key in o) {
		v = o[_key];
		_out[_key] = isObj(v) ? copy(v) : v;
	}
	return _out;
}

// https://github.com/jaredreich/tread
function merge(oldObject, newObject) {
	var obj = oldObject
	for (var key in newObject) {
		if (isObj(obj[key]))
			merge(obj[key], newObject[key]);
		else
			obj[key] = newObject[key];
	}
	return obj;
}
*/

var WIDTH = "width";
var HEIGHT = "height";
var TOP = "top";
var BOTTOM = "bottom";
var LEFT = "left";
var RIGHT = "right";
var firstChild = "firstChild";
var createElement = "createElement";
var hexBlack = "#000";
var classList = "classList";

var mousemove = "mousemove";
var mousedown = "mousedown";
var mouseup = "mouseup";
var mouseleave = "mouseleave";
var dblclick = "dblclick";
var resize = "resize";
var scroll = "scroll";

var rAF = requestAnimationFrame;
var doc = document;
var win = window;
var pxRatio = devicePixelRatio;

function addClass(el, c) {
	c != null && el[classList].add(c);
}

function remClass(el, c) {
	el[classList].remove(c);
}

function setStylePx(el, name, value) {
	el.style[name] = value + "px";
}

function placeTag(tag, cls, targ) {
	var el = doc[createElement](tag);

	if (cls != null)
		{ addClass(el, cls); }

	if (targ != null)
		{ targ.appendChild(el); }

	return el;
}

function placeDiv(cls, targ) {
	return placeTag("div", cls, targ);
}

function trans(el, xPos, yPos) {
	el.style.transform = "translate(" + xPos + "px," + yPos + "px)";
}

var evOpts = {passive: true};

function on(ev, el, cb) {
	el.addEventListener(ev, cb, evOpts);
}

function off(ev, el, cb) {
	el.removeEventListener(ev, cb, evOpts);
}

//export const series = [];

// default formatters:

function genIncrs(minExp, maxExp, mults) {
	var incrs = [];

	for (var exp = minExp; exp < maxExp; exp++) {
		for (var i = 0; i < mults.length; i++) {
			var incr = mults[i] * pow(10, exp);
			incrs.push(+incr.toFixed(abs(exp)));
		}
	}

	return incrs;
}

var incrMults = [1,2,5];

var decIncrs = genIncrs(-12, 0, incrMults);

var intIncrs = genIncrs(0, 12, incrMults);

var numIncrs = decIncrs.concat(intIncrs);

var s = 1,
	m = 60,
	h = m * m,
	d = h * 24,
	mo = d * 30,
	y = d * 365;

// starting below 1e-3 is a hack to allow the incr finder to choose & bail out at incr < 1ms
var timeIncrs = [5e-4].concat(genIncrs(-3, 0, incrMults), [
	// minute divisors (# of secs)
	1,
	5,
	10,
	15,
	30,
	// hour divisors (# of mins)
	m,
	m * 5,
	m * 10,
	m * 15,
	m * 30,
	// day divisors (# of hrs)
	h,
	h * 2,
	h * 3,
	h * 4,
	h * 6,
	h * 8,
	h * 12,
	// month divisors TODO: need more?
	d,
	d * 2,
	d * 3,
	d * 4,
	d * 5,
	d * 6,
	d * 7,
	d * 8,
	d * 9,
	d * 10,
	d * 15,
	// year divisors (# months, approx)
	mo,
	mo * 2,
	mo * 3,
	mo * 4,
	mo * 6,
	// century divisors
	y,
	y * 2,
	y * 5,
	y * 10,
	y * 25,
	y * 50,
	y * 100 ]);

function timeAxisStamps(stampCfg) {
	return stampCfg.map(function (s) { return [
		s[0],
		fmtDate(s[1]),
		s[2],
		fmtDate(s[4] ? s[1] + s[3] : s[3]) ]; });
}

var yyyy = "{YYYY}";
var NLyyyy = "\n" + yyyy;
var md = "{M}/{D}";
var NLmd = "\n" + md;

var aa = "{aa}";
var hmm = "{h}:{mm}";
var hmmaa = hmm + aa;
var ss = ":{ss}";

// [0]: minimum num secs in the tick incr
// [1]: normal tick format
// [2]: when a differing <x> is encountered - 1: sec, 2: min, 3: hour, 4: day, 5: week, 6: month, 7: year
// [3]: use a longer more contextual format
// [4]: modes: 0: replace [1] -> [3], 1: concat [1] + [3]
var _timeAxisStamps = timeAxisStamps([
	[y,        yyyy,            7,   "",                    1],
	[d * 28,   "{MMM}",         7,   NLyyyy,                1],
	[d,        md,              7,   NLyyyy,                1],
	[h,        "{h}" + aa,      4,   NLmd,                  1],
	[m,        hmmaa,           4,   NLmd,                  1],
	[s,        ss,              2,   NLmd  + " " + hmmaa,   1],
	[1e-3,     ss + ".{fff}",   2,   NLmd  + " " + hmmaa,   1] ]);

// TODO: will need to accept spaces[] and pull incr into the loop when grid will be non-uniform, eg for log scales.
// currently we ignore this for months since they're *nearly* uniform and the added complexity is not worth it
function timeAxisVals(tzDate, stamps) {
	return function (self, ticks, space) {
		var incr = round3(ticks[1] - ticks[0]);
		var s = stamps.find(function (e) { return incr >= e[0]; });

		// these track boundaries when a full label is needed again
		var prevYear = null;
		var prevDate = null;
		var prevMinu = null;

		return ticks.map(function (tick, i) {
			var date = tzDate(tick);

			var newYear = date[getFullYear]();
			var newDate = date[getDate]();
			var newMinu = date[getMinutes]();

			var diffYear = newYear != prevYear;
			var diffDate = newDate != prevDate;
			var diffMinu = newMinu != prevMinu;

			var stamp = s[2] == 7 && diffYear || s[2] == 4 && diffDate || s[2] == 2 && diffMinu ? s[3] : s[1];

			prevYear = newYear;
			prevDate = newDate;
			prevMinu = newMinu;

			return stamp(date);
		});
	}
}

function mkDate(y, m, d) {
	return new Date(y, m, d);
}

// the ensures that axis ticks, values & grid are aligned to logical temporal breakpoints and not an arbitrary timestamp
// https://www.timeanddate.com/time/dst/
// https://www.timeanddate.com/time/dst/2019.html
// https://www.epochconverter.com/timezones
function timeAxisTicks(tzDate) {
	return function (self, scaleMin, scaleMax, incr, pctSpace) {
		var ticks = [];
		var isMo = incr >= mo && incr < y;

		// get the timezone-adjusted date
		var minDate = tzDate(scaleMin);
		var minDateTs = minDate / 1e3;

		// get ts of 12am (this lands us at or before the original scaleMin)
		var minMin = mkDate(minDate[getFullYear](), minDate[getMonth](), isMo ? 1 : minDate[getDate]());
		var minMinTs = minMin / 1e3;

		if (isMo) {
			var moIncr = incr / mo;
		//	let tzOffset = scaleMin - minDateTs;		// needed?
			var tick = minDateTs == minMinTs ? minDateTs : mkDate(minMin[getFullYear](), minMin[getMonth]() + moIncr, 1) / 1e3;
			var tickDate = new Date(tick * 1e3);
			var baseYear = tickDate[getFullYear]();
			var baseMonth = tickDate[getMonth]();

			for (var i = 0; tick <= scaleMax; i++) {
				var next = mkDate(baseYear, baseMonth + moIncr * i, 1);
				var offs = next - tzDate(next / 1e3);

				tick = (+next + offs) / 1e3;

				if (tick <= scaleMax)
					{ ticks.push(tick); }
			}
		}
		else {
			var incr0 = incr >= d ? d : incr;
			var tzOffset = floor(scaleMin) - floor(minDateTs);
			var tick$1 = minMinTs + tzOffset + incrRoundUp(minDateTs - minMinTs, incr0);
			ticks.push(tick$1);

			var date0 = tzDate(tick$1);

			var prevHour = date0[getHours]() + (date0[getMinutes]() / m) + (date0[getSeconds]() / h);
			var incrHours = incr / h;

			while (1) {
				tick$1 = round3(tick$1 + incr);

				var expectedHour = floor(round6(prevHour + incrHours)) % 24;
				var tickDate$1 = tzDate(tick$1);
				var actualHour = tickDate$1.getHours();

				var dstShift = actualHour - expectedHour;

				if (dstShift > 1)
					{ dstShift = -1; }

				tick$1 -= dstShift * h;

				if (tick$1 > scaleMax)
					{ break; }

				prevHour = (prevHour + incrHours) % 24;

				// add a tick only if it's further than 70% of the min allowed label spacing
				var prevTick = ticks[ticks.length - 1];
				var pctIncr = round3((tick$1 - prevTick) / incr);

				if (pctIncr * pctSpace >= .7)
					{ ticks.push(tick$1); }
			}
		}

		return ticks;
	}
}

function timeSeriesStamp(stampCfg) {
	return fmtDate(stampCfg);
}
var _timeSeriesStamp = timeSeriesStamp('{YYYY}-{MM}-{DD} {h}:{mm}{aa}');

function timeSeriesVal(tzDate, stamp) {
	return function (self, val) { return stamp(tzDate(val)); };
}

var grid = {
	show: true,
	stroke: "rgba(0,0,0,0.07)",
	width: 2,
//	dash: [],
};

var tick = assign({}, grid, {size: 10});

var font      = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
var labelFont = "bold " + font;
var lineMult = 1.5;		// font-size multiplier

var xAxisOpts = {
	type: "x",
	show: true,
	scale: "x",
	space: 50,
	gap: 5,
	size: 50,
	labelSize: 30,
	labelFont: labelFont,
	side: 2,
//	class: "x-vals",
//	incrs: timeIncrs,
//	values: timeVals,
	grid: grid,
	tick: tick,
	font: font,
};

var numSeriesLabel = "Value";
var timeSeriesLabel = "Time";

var xSeriesOpts = {
	show: true,
	scale: "x",
//	label: "Time",
//	value: v => stamp(new Date(v * 1e3)),

	// internal caches
	min: inf,
	max: -inf,
};

function numAxisVals(self, ticks, space) {
	return ticks;
}

function numAxisTicks(self, scaleMin, scaleMax, incr, pctSpace, forceMin) {
	scaleMin = forceMin ? scaleMin : +incrRoundUp(scaleMin, incr).toFixed(12);

	var ticks = [];

	for (var val = scaleMin; val <= scaleMax; val = +(val + incr).toFixed(12))
		{ ticks.push(val); }

	return ticks;
}

function numSeriesVal(self, val) {
	return val;
}

var yAxisOpts = {
	type: "y",
	show: true,
	scale: "y",
	space: 40,
	gap: 5,
	size: 50,
	labelSize: 30,
	labelFont: labelFont,
	side: 3,
//	class: "y-vals",
//	incrs: numIncrs,
//	values: (vals, space) => vals,
	grid: grid,
	tick: tick,
	font: font,
};

var ySeriesOpts = {
//	type: "n",
	scale: "y",
	show: true,
	band: false,
	alpha: 1,
//	label: "Value",
//	value: v => v,
	values: null,

	// internal caches
	min: inf,
	max: -inf,

	path: null,
	clip: null,
};

var xScaleOpts = {
	time: true,
	auto: false,
	distr: 1,
	min:  inf,
	max: -inf,
};

var yScaleOpts = assign({}, xScaleOpts, {
	time: false,
	auto: true,
});

/*
export const scales = {
	x: {
		min: Infinity,
		max: -Infinity,
	},
	y: {
		min: Infinity,
		max: -Infinity,
	},
};
*/

var syncs = {};

function _sync(opts) {
	var clients = [];

	return {
		sub: function sub(client) {
			clients.push(client);
		},
		unsub: function unsub(client) {
			clients = clients.filter(function (c) { return c != client; });
		},
		pub: function pub(type, self, x, y, w, h, i) {
			if (clients.length > 1) {
				clients.forEach(function (client) {
					client != self && client.pub(type, self, x, y, w, h, i);
				});
			}
		}
	};
}

function setDefaults(d, xo, yo) {
	return [d[0], d[1]].concat(d.slice(2)).map(function (o, i) { return assign({}, (i == 0 || o && o.side % 2 == 0 ? xo : yo), o); });
}

function getYPos(val, scale, hgt, top) {
	var pctY = (val - scale.min) / (scale.max - scale.min);
	return top + (1 - pctY) * hgt;
}

function getXPos(val, scale, wid, lft) {
	var pctX = (val - scale.min) / (scale.max - scale.min);
	return lft + pctX * wid;
}

function snapNone(self, dataMin, dataMax) {
	return [dataMin, dataMax];
}

// this ensures that non-temporal/numeric y-axes get multiple-snapped padding added above/below
// TODO: also account for incrs when snapping to ensure top of axis gets a tick & value
function snapFifthMag(self, dataMin, dataMax) {
	return rangeNum(dataMin, dataMax, 0.2, true);
}

// dim is logical (getClientBoundingRect) pixels, not canvas pixels
function findIncr(valDelta, incrs, dim, minSpace) {
	var pxPerUnit = dim / valDelta;

	for (var i = 0; i < incrs.length; i++) {
		var space = incrs[i] * pxPerUnit;

		if (space >= minSpace)
			{ return [incrs[i], space]; }
	}
}

function filtMouse(e) {
	return e.button == 0;
}

function pxRatioFont(font) {
	var fontSize;
	font = font.replace(/\d+/, function (m) { return (fontSize = round(m * pxRatio)); });
	return [font, fontSize];
}

function Line(opts, data, then) {
	var self = this;

	opts = copy(opts);

	(opts.plugins || []).forEach(function (p) {
		if (p.opts)
			{ opts = p.opts(self, opts) || opts; }
	});

	var ready = false;

	var series  = setDefaults(opts.series, xSeriesOpts, ySeriesOpts);
	var axes    = setDefaults(opts.axes || [], xAxisOpts, yAxisOpts);
	var scales  = (opts.scales = opts.scales || {});

	var gutters = assign({
		x: round(yAxisOpts.size / 2),
		y: round(xAxisOpts.size / 3),
	}, opts.gutters);

//	self.tz = opts.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
	var tzDate = opts.tzDate || (function (ts) { return new Date(ts * 1e3); });

	var _timeAxisTicks = timeAxisTicks(tzDate);
	var _timeAxisVals = timeAxisVals(tzDate, _timeAxisStamps);
	var _timeSeriesVal = timeSeriesVal(tzDate, _timeSeriesStamp);

	self.series = series;
	self.axes = axes;
	self.scales = scales;

	var pendScales = {};

	// explicitly-set initial scales
	for (var k in scales) {
		var sc = scales[k];

		if (sc.min != null || sc.max != null)
			{ pendScales[k] = {min: sc.min, max: sc.max}; }
	}

	var legendOpts = assign({show: true}, opts.legend);

	// set default value
	series.forEach(function (s, i) {
		// init scales & defaults
		var scKey = s.scale;

		var sc = scales[scKey] = assign({}, (i == 0 ? xScaleOpts : yScaleOpts), scales[scKey]);

		var isTime = sc.time;

		sc.range = fnOrSelf(sc.range || (i > 0 && !isTime ? snapFifthMag : snapNone));

		s.spanGaps = s.spanGaps === true ? retArg2 : fnOrSelf(s.spanGaps || []);

		var sv = s.value;
		s.value = isTime ? (isStr(sv) ? timeSeriesVal(tzDate, timeSeriesStamp(sv)) : sv || _timeSeriesVal) : sv || numSeriesVal;
		s.label = s.label || (isTime ? timeSeriesLabel : numSeriesLabel);
		s.width = s.width == null ? 1 : s.width;
		s.paths = s.paths || buildPaths;
		s._paths = null;
	});

	// dependent scales inherit
	for (var k$1 in scales) {
		var sc$1 = scales[k$1];

		if (sc$1.from != null)
			{ scales[k$1] = assign({}, scales[sc$1.from], sc$1); }
	}

	var xScaleKey = series[0].scale;
	var xScaleDistr = scales[xScaleKey].distr;

	// set axis defaults
	axes.forEach(function (axis, i) {
		if (axis.show) {
			var isVt = axis.side % 2;

			var sc = scales[axis.scale];

			// this can occur if all series specify non-default scales
			if (sc == null) {
				axis.scale = isVt ? series[1].scale : xScaleKey;
				sc = scales[axis.scale];
			}

			// also set defaults for incrs & values based on axis distr
			var isTime = sc.time;

			axis.space = fnOrSelf(axis.space);
			axis.incrs = fnOrSelf(axis.incrs || (sc.distr == 2 ? intIncrs : (isTime ? timeIncrs : numIncrs)));
			axis.ticks = fnOrSelf(axis.ticks || (sc.distr == 1 && isTime ? _timeAxisTicks : numAxisTicks));
			var av = axis.values;
			axis.values = isTime ? (isArr(av) ? timeAxisVals(tzDate, timeAxisStamps(av)) : av || _timeAxisVals) : av || numAxisVals;

			axis.font      = pxRatioFont(axis.font);
			axis.labelFont = pxRatioFont(axis.labelFont);
		}
	});

	var root = self.root = placeDiv("uplot");

	if (opts.id != null)
		{ root.id = opts.id; }

	addClass(root, opts.class);

	if (opts.title) {
		var title = placeDiv("title", root);
		title.textContent = opts.title;
	}

	var dataLen;

	// rendered data window
	var i0 = null;
	var i1 = null;
	var idxs = self.idxs = [i0, i1];

	var data0 = null;

	function setData(_data, _autoScaleX) {
		self.data = _data;
		data = _data.slice();
		data0 = data[0];
		dataLen = data0.length;

		if (xScaleDistr == 2)
			{ data[0] = data0.map(function (v, i) { return i; }); }

		resetYSeries();

		fire("setData");

		_autoScaleX !== false && autoScaleX();
	}

	self.setData = setData;

	function autoScaleX() {
		i0 = idxs[0] = 0;
		i1 = idxs[1] = dataLen - 1;

		var _min = xScaleDistr == 2 ? i0 : data[0][i0],
			_max = xScaleDistr == 2 ? i1 : data[0][i1];

		_setScale(xScaleKey, _min, _max);
	}

	function setCtxStyle(stroke, width, dash, fill) {
		ctx.strokeStyle = stroke || hexBlack;
		ctx.lineWidth = width || 1;
		ctx.lineJoin = "round";
		ctx.setLineDash(dash || []);
		ctx.fillStyle = fill || hexBlack;
	}

	var fullWidCss;
	var fullHgtCss;

	var plotWidCss;
	var plotHgtCss;

	// plot margins to account for axes
	var plotLftCss;
	var plotTopCss;

	var plotLft;
	var plotTop;
	var plotWid;
	var plotHgt;

	self.bbox = {};

	function _setSize(width, height) {
		self.width  = fullWidCss = plotWidCss = width;
		self.height = fullHgtCss = plotHgtCss = height;
		plotLftCss  = plotTopCss = 0;

		calcPlotRect();
		calcAxesRects();

		var bb = self.bbox;

		plotLft = bb[LEFT]   = incrRound(plotLftCss * pxRatio, 0.5);
		plotTop = bb[TOP]    = incrRound(plotTopCss * pxRatio, 0.5);
		plotWid = bb[WIDTH]  = incrRound(plotWidCss * pxRatio, 0.5);
		plotHgt = bb[HEIGHT] = incrRound(plotHgtCss * pxRatio, 0.5);

		setStylePx(under, LEFT,   plotLftCss);
		setStylePx(under, TOP,    plotTopCss);
		setStylePx(under, WIDTH,  plotWidCss);
		setStylePx(under, HEIGHT, plotHgtCss);

		setStylePx(over, LEFT,    plotLftCss);
		setStylePx(over, TOP,     plotTopCss);
		setStylePx(over, WIDTH,   plotWidCss);
		setStylePx(over, HEIGHT,  plotHgtCss);

		setStylePx(wrap, WIDTH,   fullWidCss);
		setStylePx(wrap, HEIGHT,  fullHgtCss);

		can[WIDTH]  = round(fullWidCss * pxRatio);
		can[HEIGHT] = round(fullHgtCss * pxRatio);

		ready && autoScaleX();

		ready && fire("setSize");
	}

	function setSize(ref) {
		var width = ref.width;
		var height = ref.height;

		_setSize(width, height);
	}

	self.setSize = setSize;

	// accumulate axis offsets, reduce canvas width
	function calcPlotRect() {
		// easements for edge labels
		var hasTopAxis = false;
		var hasBtmAxis = false;
		var hasRgtAxis = false;
		var hasLftAxis = false;

		axes.forEach(function (axis, i) {
			if (axis.show) {
				var side = axis.side;
				var size = axis.size;
				var isVt = side % 2;
				var labelSize = axis.labelSize = (axis.label != null ? (axis.labelSize || 30) : 0);

				var fullSize = size + labelSize;

				if (isVt) {
					plotWidCss -= fullSize;

					if (side == 3) {
						plotLftCss += fullSize;
						hasLftAxis = true;
					}
					else
						{ hasRgtAxis = true; }
				}
				else {
					plotHgtCss -= fullSize;

					if (side == 0) {
						plotTopCss += fullSize;
						hasTopAxis = true;
					}
					else
						{ hasBtmAxis = true; }
				}
			}
		});

		// hz gutters
		if (hasTopAxis || hasBtmAxis) {
			if (!hasRgtAxis)
				{ plotWidCss -= gutters.x; }
			if (!hasLftAxis) {
				plotWidCss -= gutters.x;
				plotLftCss += gutters.x;
			}
		}

		// vt gutters
		if (hasLftAxis || hasRgtAxis) {
			if (!hasBtmAxis)
				{ plotHgtCss -= gutters.y; }
			if (!hasTopAxis) {
				plotHgtCss -= gutters.y;
				plotTopCss += gutters.y;
			}
		}
	}

	function calcAxesRects() {
		// will accum +
		var off1 = plotLftCss + plotWidCss;
		var off2 = plotTopCss + plotHgtCss;
		// will accum -
		var off3 = plotLftCss;
		var off0 = plotTopCss;

		function incrOffset(side, size) {

			switch (side) {
				case 1: off1 += size; return off1 - size;
				case 2: off2 += size; return off2 - size;
				case 3: off3 -= size; return off3 + size;
				case 0: off0 -= size; return off0 + size;
			}
		}

		axes.forEach(function (axis, i) {
			var side = axis.side;

			axis._pos = incrOffset(side, axis.size);

			if (axis.label != null)
				{ axis._lpos = incrOffset(side, axis.labelSize); }
		});
	}

	var can = placeTag("canvas");
	var ctx = self.ctx = can.getContext("2d");

	var wrap = placeDiv("wrap", root);
	var under = placeDiv("under", wrap);
	wrap.appendChild(can);
	var over = placeDiv("over", wrap);

	function setScales() {
		if (inBatch) {
			shouldSetScales = true;
			return;
		}

	//	log("setScales()", arguments);

		// cache original scales' min/max & reset
		var minMaxes = {};

		for (var k in scales) {
			var sc = scales[k];
			var psc = pendScales[k];

			minMaxes[k] = {
				min: sc.min,
				max: sc.max
			};

			if (psc != null) {
				assign(sc, psc);

				// explicitly setting the x-scale invalidates everything (acts as redraw)
				if (k == xScaleKey)
					{ resetYSeries(); }
			}
			else if (k != xScaleKey) {
				sc.min = inf;
				sc.max = -inf;
			}
		}

		// pre-range y-scales from y series' data values
		series.forEach(function (s, i) {
			var k = s.scale;
			var sc = scales[k];

			// setting the x scale invalidates everything
			if (i == 0) {
				i0 = closestIdx(sc.min, data[0]);
				i1 = closestIdx(sc.max, data[0]);

				// closest indices can be outside of view
				if (data[0][i0] < sc.min)
					{ i0++; }
				if (data[0][i1] > sc.max)
					{ i1--; }

				idxs[0] = i0;
				idxs[1] = i1;

				s.min = data0[i0];
				s.max = data0[i1];

				var minMax = sc.range(self, sc.min, sc.max);

				sc.min = minMax[0];
				sc.max = minMax[1];
			}
			else if (s.show && pendScales[k] == null) {
				// only run getMinMax() for invalidated series data, else reuse
				var minMax$1 = s.min == inf ? (sc.auto ? getMinMax(data[i], i0, i1) : [0,100]) : [s.min, s.max];

				// initial min/max
				sc.min = min(sc.min, s.min = minMax$1[0]);
				sc.max = max(sc.max, s.max = minMax$1[1]);
			}
		});

		// snap non-dependent scales
		for (var k$1 in scales) {
			var sc$1 = scales[k$1];

			if (sc$1.from == null && sc$1.min != inf && pendScales[k$1] == null) {
				var minMax = sc$1.range(self, sc$1.min, sc$1.max);

				sc$1.min = minMax[0];
				sc$1.max = minMax[1];
			}

			pendScales[k$1] = null;
		}

		// range dependent scales
		for (var k$2 in scales) {
			var sc$2 = scales[k$2];

			if (sc$2.from != null) {
				var base = scales[sc$2.from];

				if (base.min != inf) {
					var minMax$1 = sc$2.range(self, base.min, base.max);
					sc$2.min = minMax$1[0];
					sc$2.max = minMax$1[1];
				}
			}
		}

		var changed = {};

		// invalidate paths of all series on changed scales
		series.forEach(function (s, i) {
			var k = s.scale;
			var sc = scales[k];

			if (minMaxes[k] != null && (sc.min != minMaxes[k].min || sc.max != minMaxes[k].max)) {
				changed[k] = true;
				s._paths = null;
			}
		});

		for (var k$3 in changed)
			{ fire("setScale", k$3); }

		cursor.show && updateCursor();
	}

	// grabs the nearest indices with y data outside of x-scale limits
	function getOuterIdxs(ydata) {
		var _i0 = clamp(i0 - 1, 0, dataLen - 1);
		var _i1 = clamp(i1 + 1, 0, dataLen - 1);

		while (ydata[_i0] == null && _i0 > 0)
			{ _i0--; }

		while (ydata[_i1] == null && _i1 < dataLen - 1)
			{ _i1++; }

		return [_i0, _i1];
	}

	var dir = 1;

	function drawSeries() {
		series.forEach(function (s, i) {
			if (i > 0 && s.show && s._paths == null) {
				var _idxs = getOuterIdxs(data[i]);
				s._paths = s.paths(self, i, _idxs[0], _idxs[1]);
			}
		});

		series.forEach(function (s, i) {
			if (i > 0 && s.show && s._paths) {
				drawPath(i);
				fire("drawSeries", i);
			}
		});
	}

	function drawPath(is) {
		var s = series[is];

		if (dir == 1) {
			var ref = s._paths;
			var stroke = ref.stroke;
			var fill = ref.fill;
			var clip = ref.clip;
			var width = s[WIDTH];
			var offset = (width % 2) / 2;

			setCtxStyle(s.stroke, width, s.dash, s.fill);

			ctx.globalAlpha = s.alpha;

			ctx.translate(offset, offset);

			ctx.save();

			ctx.rect(plotLft, plotTop, plotWid, plotHgt);
			ctx.clip();

			if (clip != null)
				{ ctx.clip(clip); }

			if (s.band) {
				ctx.fill(stroke);
				width && ctx.stroke(stroke);
			}
			else {
				width && ctx.stroke(stroke);

				if (s.fill != null)
					{ ctx.fill(fill); }
			}

			ctx.restore();

			ctx.translate(-offset, -offset);

			ctx.globalAlpha = 1;
		}

		if (s.band)
			{ dir *= -1; }
	}

	function buildClip(s, gaps) {
		var toSpan = new Set(s.spanGaps(self, gaps));
		gaps = gaps.filter(function (g) { return !toSpan.has(g); });

		var clip = null;

		// create clip path (invert gaps and non-gaps)
		if (gaps.length > 0) {
			clip = new Path2D();

			var prevGapEnd = plotLft;

			for (var i = 0; i < gaps.length; i++) {
				var g = gaps[i];

				clip.rect(prevGapEnd, plotTop, g[0] - prevGapEnd, plotTop + plotHgt);

				prevGapEnd = g[1];
			}

			clip.rect(prevGapEnd, plotTop, plotLft + plotWid - prevGapEnd, plotTop + plotHgt);
		}

		return clip;
	}

	function buildPaths(self, is, _i0, _i1) {
		var s = series[is];

		var xdata  = data[0];
		var ydata  = data[is];
		var scaleX = scales[xScaleKey];
		var scaleY = scales[s.scale];

		var _paths = dir == 1 ? {stroke: new Path2D(), fill: null, clip: null} : series[is-1]._paths;
		var stroke = _paths.stroke;
		var width = s[WIDTH];

		var minY = inf,
			maxY = -inf,
			outY, outX;

		var gaps = [];

		var accX = round(getXPos(xdata[dir == 1 ? _i0 : _i1], scaleX, plotWid, plotLft));

		// the moves the shape edge outside the canvas so stroke doesnt bleed in
		if (s.band && dir == 1 && width && _i0 == i0)
			{ stroke.lineTo(-width, round(getYPos(ydata[_i0], scaleY, plotHgt, plotTop))); }

		for (var i = dir == 1 ? _i0 : _i1; i >= _i0 && i <= _i1; i += dir) {
			var x = round(getXPos(xdata[i], scaleX, plotWid, plotLft));

			if (x == accX) {
				if (ydata[i] != null) {
					outY = round(getYPos(ydata[i], scaleY, plotHgt, plotTop));
					minY = min(outY, minY);
					maxY = max(outY, maxY);
				}
			}
			else {
				var addGap = false;

				if (minY != inf) {
					stroke.lineTo(accX, minY);
					stroke.lineTo(accX, maxY);
					stroke.lineTo(accX, outY);
					outX = accX;
				}
				else
					{ addGap = true; }

				if (ydata[i] != null) {
					outY = round(getYPos(ydata[i], scaleY, plotHgt, plotTop));
					stroke.lineTo(x, outY);
					minY = maxY = outY;

					// prior pixel can have data but still start a gap if ends with null
					if (x - accX > 1 && ydata[i-1] == null)
						{ addGap = true; }
				}
				else {
					minY = inf;
					maxY = -inf;
				}

				if (addGap) {
					var prevGap = gaps[gaps.length - 1];

					if (prevGap && prevGap[0] == outX)			// TODO: gaps must be encoded at stroke widths?
						{ prevGap[1] = x; }
					else
						{ gaps.push([outX, x]); }
				}

				accX = x;
			}
		}

		if (dir == 1) {
			_paths.clip = buildClip(s, gaps);

			if (s.fill != null) {
				var fill = _paths.fill = new Path2D(stroke);

				var zeroY = round(getYPos(0, scaleY, plotHgt, plotTop));
				fill.lineTo(plotLft + plotWid, zeroY);
				fill.lineTo(plotLft, zeroY);
			}
		}

		// todo: don't build gaps on dir = -1 pass

		if (s.band) {
			var overShoot = width * 100, _iy, _x;

			// the moves the shape edge outside the canvas so stroke doesnt bleed in
			if (dir == -1 && _i0 == i0) {
				_x = plotLft - overShoot;
				_iy = _i0;
			}

			if (dir == 1 && _i1 == i1) {
				_x = plotLft + plotWid + overShoot;
				_iy = _i1;
			}

			stroke.lineTo(_x, round(getYPos(ydata[_iy], scaleY, plotHgt, plotTop)));

			dir *= -1;
		}

		return _paths;
	}

	function getIncrSpace(axis, min, max, canDim) {
		var minSpace = axis.space(self, min, max, canDim);
		var incrs = axis.incrs(self, min, max, canDim, minSpace);
		var incrSpace = findIncr(max - min, incrs, canDim, minSpace);
		incrSpace.push(incrSpace[1]/minSpace);
		return incrSpace;
	}

	function drawOrthoLines(offs, ori, side, pos0, len, width, stroke, dash) {
		var offset = (width % 2) / 2;

		ctx.translate(offset, offset);

		setCtxStyle(stroke, width, dash);

		ctx.beginPath();

		var x0, y0, x1, y1, pos1 = pos0 + (side == 0 || side == 3 ? -len : len);

		if (ori == 0) {
			y0 = pos0;
			y1 = pos1;
		}
		else {
			x0 = pos0;
			x1 = pos1;
		}

		offs.forEach(function (off, i) {
			if (ori == 0)
				{ x0 = x1 = off; }
			else
				{ y0 = y1 = off; }

			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
		});

		ctx.stroke();

		ctx.translate(-offset, -offset);
	}

	function drawAxesGrid() {
		axes.forEach(function (axis, i) {
			if (!axis.show)
				{ return; }

			var scale = scales[axis.scale];

			// this will happen if all series using a specific scale are toggled off
			if (scale.min == inf)
				{ return; }

			var side = axis.side;
			var ori = side % 2;

			var min = scale.min;
			var max = scale.max;

			var ref = getIncrSpace(axis, min, max, ori == 0 ? plotWidCss : plotHgtCss);
			var incr = ref[0];
			var space = ref[1];
			var pctSpace = ref[2];

			// if we're using index positions, force first tick to match passed index
			var forceMin = scale.distr == 2;

			var ticks = axis.ticks(self, min, max, incr, pctSpace, forceMin);

			var getPos  = ori == 0 ? getXPos : getYPos;
			var plotDim = ori == 0 ? plotWid : plotHgt;
			var plotOff = ori == 0 ? plotLft : plotTop;

			var canOffs = ticks.map(function (val) { return round(getPos(val, scale, plotDim, plotOff)); });

			var axisGap  = round(axis.gap * pxRatio);

			var tick = axis.tick;
			var tickSize = tick.show ? round(tick.size * pxRatio) : 0;

			// tick labels
			var values = axis.values(self, scale.distr == 2 ? ticks.map(function (i) { return data0[i]; }) : ticks, space);		// BOO this assumes a specific data/series

			var basePos  = round(axis._pos * pxRatio);
			var shiftAmt = tickSize + axisGap;
			var shiftDir = ori == 0 && side == 0 || ori == 1 && side == 3 ? -1 : 1;
			var finalPos = basePos + shiftAmt * shiftDir;
			var y        = ori == 0 ? finalPos : 0;
			var x        = ori == 1 ? finalPos : 0;

			ctx.font         = axis.font[0];
			ctx.fillStyle    = axis.stroke || hexBlack;									// rgba?
			ctx.textAlign    = ori == 0 ? "center" : side == 3 ? RIGHT : LEFT;
			ctx.textBaseline = ori == 1 ? "middle" : side == 2 ? TOP   : BOTTOM;

			var lineHeight   = axis.font[1] * lineMult;

			canOffs.forEach(function (off, i) {
				if (ori == 0)
					{ x = off; }
				else
					{ y = off; }

				(""+values[i]).split(/\n/gm).forEach(function (text, j) {
					ctx.fillText(text, x, y + j * lineHeight);
				});
			});

			// axis label
			if (axis.label) {
				ctx.save();

				var baseLpos = round(axis._lpos * pxRatio);

				if (ori == 1) {
					x = y = 0;

					ctx.translate(
						baseLpos,
						round(plotTop + plotHgt / 2)
					);
					ctx.rotate((side == 3 ? -PI : PI) / 2);

				}
				else {
					x = round(plotLft + plotWid / 2);
					y = baseLpos;
				}

				ctx.font         = axis.labelFont[0];
			//	ctx.fillStyle    = axis.labelStroke || hexBlack;						// rgba?
				ctx.textAlign    = "center";
				ctx.textBaseline = side == 2 ? TOP : BOTTOM;

				ctx.fillText(axis.label, x, y);

				ctx.restore();
			}

			// ticks
			if (tick.show) {
				drawOrthoLines(
					canOffs,
					ori,
					side,
					basePos,
					tickSize,
					tick[WIDTH],
					tick.stroke
				);
			}

			// grid
			var grid = axis.grid;

			if (grid.show) {
				drawOrthoLines(
					canOffs,
					ori,
					ori == 0 ? 2 : 1,
					ori == 0 ? plotTop : plotLft,
					ori == 0 ? plotHgt : plotWid,
					grid[WIDTH],
					grid.stroke,
					grid.dash
				);
			}
		});

		fire("drawAxes");
	}

	function resetYSeries() {
	//	log("resetYSeries()", arguments);

		series.forEach(function (s, i) {
			if (i > 0) {
				s.min = inf;
				s.max = -inf;
				s._paths = null;
			}
		});
	}

	var didPaint;

	function paint() {
		if (inBatch) {
			shouldPaint = true;
			return;
		}

	//	log("paint()", arguments);

		ctx.clearRect(0, 0, can[WIDTH], can[HEIGHT]);
		fire("drawClear");
		drawAxesGrid();
		drawSeries();
		didPaint = true;
		fire("draw");
	}

	self.redraw = paint;

	// redraw() => setScale('x', scales.x.min, scales.x.max);

	// explicit, never re-ranged
	function setScale(key, opts) {
		var sc = scales[key];

		if (sc.from == null) {
			// prevent setting a temporal x scale too small since Date objects cannot advance ticks smaller than 1ms
			if (key == xScaleKey && sc.time) {
				// since scales and axes are loosly coupled, we have to make some assumptions here :(
				var incr = getIncrSpace(axes[0], opts.min, opts.max, plotWidCss)[0];

				if (incr < 1e-3)
					{ return; }
			}

		//	log("setScale()", arguments);

			pendScales[key] = opts;

			didPaint = false;
			setScales();
			!didPaint && paint();
			didPaint = false;
		}
	}

	self.setScale = setScale;

//	INTERACTION

	var vt;
	var hz;

	// starting position
	var mouseLeft0;
	var mouseTop0;

	// current position
	var mouseLeft1;
	var mouseTop1;

	var dragging = false;

	var cursor = self.cursor = assign({
		show: true,
		x: true,
		y: true,
		lock: false,
		points: true,

		drag: {
			setScale: true,
			x: true,
			y: false,
		},

		locked: false,
		left: -10,
		top: -10,
		idx: null,
	}, opts.cursor);

	var focus = cursor.focus;		// focus: {alpha, prox}
	var drag = cursor.drag;

	if (cursor.show) {
		var c = "cursor-";

		if (cursor.x) {
			mouseLeft1 = cursor.left;
			vt = placeDiv(c + "x", over);
		}

		if (cursor.y) {
			mouseTop1 = cursor.top;
			hz = placeDiv(c + "y", over);
		}
	}

	var select = placeDiv("select", over);

	var _select = self.select = {
		left:	0,
		width:	0,
		top:	0,
		height:	0,
	};

	function setSelect(opts, _fire) {
		if (opts[WIDTH] == null && drag.y)
			{ opts[WIDTH] = plotWidCss; }

		if (opts[HEIGHT] == null && drag.x)
			{ opts[HEIGHT] = plotHgtCss; }

		for (var prop in opts)
			{ setStylePx(select, prop, _select[prop] = opts[prop]); }

		_fire !== false && fire("setSelect");
	}

	self.setSelect = setSelect;

	var legend = null;
	var legendRows = null;
	var multiValLegend = false;

	if (legendOpts.show) {
		legend = placeTag("table", "legend", root);

		var vals = series[1].values;
		multiValLegend = vals != null;

		var keys;

		if (multiValLegend) {
			var head = placeTag("tr", "labels", legend);
			placeTag("th", null, head);
			keys = vals(0);

			for (var key in keys)
				{ placeTag("th", null, head).textContent = key; }
		}
		else {
			keys = {_: 0};
			addClass(legend, "inline");
		}

		legendRows = series.map(function (s, i) {
			if (i == 0 && multiValLegend)
				{ return null; }

			var _row = [];

			var row = placeTag("tr", "series", legend);

			addClass(row, s.class);

			if (!s.show)
				{ addClass(row, "off"); }

			var label = placeTag("th", null, row);

			var indic = placeDiv("ident", label);
			s.width && (indic.style.borderColor = s.stroke);
			indic.style.backgroundColor = s.fill;

			var text = placeDiv("text", label);
			text.textContent = s.label;

			if (i > 0) {
				on("click", label, function (e) {
					if (cursor.locked)
						{ return; }

					filtMouse(e) && setSeries(i, {show: !s.show}, syncOpts.setSeries);
				});

				if (focus) {
					on("mouseenter", label, function (e) {
						if (cursor.locked)
							{ return; }

						setSeries(i, {focus: true}, syncOpts.setSeries);
					});
				}
			}

			for (var key in keys) {
				var v = placeTag("td", null, row);
				v.textContent = "--";
				_row.push(v);
			}

			return _row;
		});
	}

	function toggleDOM(i, onOff) {
		var s = series[i];
		var label = legendOpts.show ? legendRows[i][0].parentNode : null;

		if (s.show)
			{ label && remClass(label, "off"); }
		else {
			label && addClass(label, "off");
			showPoints && trans(cursorPts[i], 0, -10);
		}
	}

	function _setScale(key, min, max) {
		setScale(key, {min: min, max: max});
	}

	function setSeries(i, opts, pub) {
	//	log("setSeries()", arguments);

		var s = series[i];

	//	batch(() => {
			// will this cause redundant paint() if both show and focus are set?
			if (opts.focus != null)
				{ setFocus(i); }

			if (opts.show != null) {
				s.show = opts.show;
				toggleDOM(i, opts.show);

				if (s.band) {
					// not super robust, will break if two bands are adjacent
					var ip = series[i+1] && series[i+1].band ? i+1 : i-1;
					series[ip].show = s.show;
					toggleDOM(ip, opts.show);
				}

				_setScale(xScaleKey, scales[xScaleKey].min, scales[xScaleKey].max);		// redraw
			}
	//	});

		// firing setSeries after setScale seems out of order, but provides access to the updated props
		// could improve by predefining firing order and building a queue
		fire("setSeries", i, opts);

		pub && sync.pub("setSeries", self, i, opts);
	}

	self.setSeries = setSeries;

	function _alpha(i, value) {
		series[i].alpha = value;

		if (legendRows)
			{ legendRows[i][0].parentNode.style.opacity = value; }
	}

	function _setAlpha(i, value) {
		var s = series[i];

		_alpha(i, value);

		if (s.band) {
			// not super robust, will break if two bands are adjacent
			var ip = series[i+1].band ? i+1 : i-1;
			_alpha(ip, value);
		}
	}

	// y-distance
	var distsToCursor = Array(series.length);

	var focused = null;

	function setFocus(i) {
		if (i != focused) {
		//	log("setFocus()", arguments);

			series.forEach(function (s, i2) {
				_setAlpha(i2, i == null || i2 == 0 || i2 == i ? 1 : focus.alpha);
			});

			focused = i;
			paint();
		}
	}

	if (focus && legendOpts.show) {
		on(mouseleave, legend, function (e) {
			if (cursor.locked)
				{ return; }
			setSeries(null, {focus: false}, syncOpts.setSeries);
			updateCursor();
		});
	}

	var showPoints = cursor.show && cursor.points;

	// series-intersection markers
	var cursorPts = showPoints ? series.map(function (s, i) {
		if (i > 0) {
			var pt = placeDiv("cursor-pt", over);

			addClass(pt, s.class);

			pt.style.background = s.stroke;

			var size = max(5, s.width * 2 - 1);
			var mar = (size - 1) / -2;

			setStylePx(pt, WIDTH, size);
			setStylePx(pt, HEIGHT, size);
			setStylePx(pt, "marginLeft", mar);
			setStylePx(pt, "marginTop", mar);

			trans(pt, -10, -10);
			return pt;
		}
	}) : null;

	var cursorRaf = 0;

	function scaleValueAtPos(pos, scale) {
		var dim = scale == xScaleKey ? plotWidCss : plotHgtCss;
		var pct = clamp(pos / dim, 0, 1);

		var sc = scales[scale];
		var d = sc.max - sc.min;
		return sc.min + pct * d;
	}

	function closestIdxFromXpos(pos) {
		var v = scaleValueAtPos(pos, xScaleKey);
		return closestIdx(v, data[0], i0, i1);
	}

	self.posToIdx = closestIdxFromXpos;
	self.posToVal = function (pos, scale) { return scaleValueAtPos(scale == xScaleKey ? pos : plotHgtCss - pos, scale); };
	self.valToPos = function (val, scale, can) { return (
		scale == xScaleKey ?
		getXPos(val, scales[scale],
			can ? plotWid : plotWidCss,
			can ? plotLft : 0
		) :
		getYPos(val, scales[scale],
			can ? plotHgt : plotHgtCss,
			can ? plotTop : 0
		)
	); };

	var inBatch = false;
	var shouldPaint = false;
	var shouldSetScales = false;
	var shouldUpdateCursor = false;

	// defers calling expensive functions
	function batch(fn) {
		inBatch = true;
		fn(self);
		inBatch = false;
		shouldSetScales && setScales();
		shouldUpdateCursor && updateCursor();
		shouldPaint && !didPaint && paint();
		shouldSetScales = shouldUpdateCursor = shouldPaint = didPaint = inBatch;
	}

	self.batch = batch;

	self.setCursor = function (opts) {
		mouseLeft1 = opts.left;
		mouseTop1 = opts.top;
	//	assign(cursor, opts);
		updateCursor();
	};

	function updateCursor(ts) {
		if (inBatch) {
			shouldUpdateCursor = true;
			return;
		}

	//	ts == null && log("updateCursor()", arguments);

		cursorRaf = 0;

		if (cursor.show) {
			cursor.x && trans(vt,round(mouseLeft1),0);
			cursor.y && trans(hz,0,round(mouseTop1));
		}

		var idx;

		// if cursor hidden, hide points & clear legend vals
		if (mouseLeft1 < 0) {
			idx = null;

			for (var i = 0; i < series.length; i++) {
				if (i > 0) {
					distsToCursor[i] = inf;
					showPoints && trans(cursorPts[i], -10, -10);
				}

				if (legendOpts.show) {
					if (i == 0 && multiValLegend)
						{ continue; }

					for (var j = 0; j < legendRows[i].length; j++)
						{ legendRows[i][j][firstChild].nodeValue = '--'; }
				}
			}

			if (focus)
				{ setSeries(null, {focus: true}, syncOpts.setSeries); }
		}
		else {
		//	let pctY = 1 - (y / rect[HEIGHT]);

			idx = closestIdxFromXpos(mouseLeft1);

			var scX = scales[xScaleKey];

			var xPos = round2(getXPos(data[0][idx], scX, plotWidCss, 0));

			for (var i$1 = 0; i$1 < series.length; i$1++) {
				var s = series[i$1];

				if (i$1 > 0 && s.show) {
					var valAtIdx = data[i$1][idx];

					var yPos = valAtIdx == null ? -10 : round2(getYPos(valAtIdx, scales[s.scale], plotHgtCss, 0));

					distsToCursor[i$1] = yPos > 0 ? abs(yPos - mouseTop1) : inf;

					showPoints && trans(cursorPts[i$1], xPos, yPos);
				}
				else
					{ distsToCursor[i$1] = inf; }

				if (legendOpts.show) {
					if (i$1 == 0 && multiValLegend)
						{ continue; }

					var src = i$1 == 0 && xScaleDistr == 2 ? data0 : data[i$1];

					var vals = multiValLegend ? s.values(self, idx) : {_: s.value(self, src[idx], idx, i$1)};

					var j$1 = 0;

					for (var k in vals)
						{ legendRows[i$1][j$1++][firstChild].nodeValue = vals[k]; }
				}
			}

			if (dragging) {
				// setSelect should not be triggered on move events
				if (drag.x) {
					var minX = min(mouseLeft0, mouseLeft1);
					var maxX = max(mouseLeft0, mouseLeft1);
					setStylePx(select, LEFT, _select[LEFT] = minX);
					setStylePx(select, WIDTH, _select[WIDTH] = maxX - minX);
				}

				if (drag.y) {
					var minY = min(mouseTop0, mouseTop1);
					var maxY = max(mouseTop0, mouseTop1);
					setStylePx(select, TOP, _select[TOP] = minY);
					setStylePx(select, HEIGHT, _select[HEIGHT] = maxY - minY);
				}
			}
		}

		// if ts is present, means we're implicitly syncing own cursor as a result of debounced rAF
		if (ts != null) {
			// this is not technically a "mousemove" event, since it's debounced, rename to setCursor?
			// since this is internal, we can tweak it later
			sync.pub(mousemove, self, mouseLeft1, mouseTop1, plotWidCss, plotHgtCss, idx);

			if (focus) {
				var minDist = min.apply(null, distsToCursor);

				var fi = null;

				if (minDist <= focus.prox) {
					distsToCursor.some(function (dist, i) {
						if (dist == minDist)
							{ return fi = i; }
					});
				}

				setSeries(fi, {focus: true}, syncOpts.setSeries);
			}
		}

		cursor.idx = idx;
		cursor.left = mouseLeft1;
		cursor.top = mouseTop1;

		ready && fire("setCursor");
	}

	var rect = null;

	function syncRect() {
		rect = over.getBoundingClientRect();
	}

	function mouseMove(e, src, _x, _y, _w, _h, _i) {
		if (cursor.locked)
			{ return; }

		if (rect == null)
			{ syncRect(); }

		cacheMouse(e, src, _x, _y, _w, _h, _i, false, e != null);

		if (e != null) {
			if (cursorRaf == 0)
				{ cursorRaf = rAF(updateCursor); }
		}
		else
			{ updateCursor(); }
	}

	function cacheMouse(e, src, _x, _y, _w, _h, _i, initial, snap) {
		if (e != null) {
			_x = e.clientX - rect.left;
			_y = e.clientY - rect.top;
		}
		else {
			_x = plotWidCss * (_x/_w);
			_y = plotHgtCss * (_y/_h);
		}

		if (snap) {
			if (_x <= 1 || _x >= plotWidCss - 1)
				{ _x = incrRound(_x, plotWidCss); }

			if (_y <= 1 || _y >= plotHgtCss - 1)
				{ _y = incrRound(_y, plotHgtCss); }
		}

		if (initial) {
			mouseLeft0 = _x;
			mouseTop0 = _y;
		}
		else {
			mouseLeft1 = _x;
			mouseTop1 = _y;
		}
	}

	function hideSelect() {
		setSelect({
			width:	!drag.x ? plotWidCss : 0,
			height:	!drag.y ? plotHgtCss : 0,
		}, false);
	}

	function mouseDown(e, src, _x, _y, _w, _h, _i) {
		if (e == null || filtMouse(e)) {
			dragging = true;

			cacheMouse(e, src, _x, _y, _w, _h, _i, true, true);

			if (drag.x || drag.y)
				{ hideSelect(); }

			if (e != null) {
				on(mouseup, doc, mouseUp);
				sync.pub(mousedown, self, mouseLeft0, mouseTop0, plotWidCss, plotHgtCss, null);
			}
		}
	}

	function mouseUp(e, src, _x, _y, _w, _h, _i) {
		if ((e == null || filtMouse(e))) {
			dragging = false;

			cacheMouse(e, src, _x, _y, _w, _h, _i, false, true);

			if (mouseLeft1 != mouseLeft0 || mouseTop1 != mouseTop0) {
				setSelect(_select);

				if (drag.setScale) {
					batch(function () {
						if (drag.x) {
							var fn = xScaleDistr == 2 ? closestIdxFromXpos : scaleValueAtPos;

							_setScale(xScaleKey,
								fn(_select[LEFT], xScaleKey),
								fn(_select[LEFT] + _select[WIDTH], xScaleKey)
							);
						}

						if (drag.y) {
							for (var k in scales) {
								var sc = scales[k];

								if (k != xScaleKey && sc.from == null) {
									_setScale(k,
										scaleValueAtPos(plotHgtCss - _select[TOP] - _select[HEIGHT], k),
										scaleValueAtPos(plotHgtCss - _select[TOP], k)
									);
								}
							}
						}
					});

					hideSelect();
				}
			}
			else if (cursor.lock) {
				cursor.locked = !cursor.locked;

				if (!cursor.locked)
					{ updateCursor(); }
			}

			if (e != null) {
				off(mouseup, doc, mouseUp);
				sync.pub(mouseup, self, mouseLeft1, mouseTop1, plotWidCss, plotHgtCss, null);
			}
		}
	}

	function mouseLeave(e, src, _x, _y, _w, _h, _i) {
		if (!cursor.locked && !dragging) {
			mouseLeft1 = -10;
			mouseTop1 = -10;
			// passing a non-null timestamp to force sync/mousemove event
			updateCursor(1);
		}
	}

	function dblClick(e, src, _x, _y, _w, _h, _i) {
		autoScaleX();

		if (e != null)
			{ sync.pub(dblclick, self, mouseLeft1, mouseTop1, plotWidCss, plotHgtCss, null); }
	}

	// internal pub/sub
	var events = {};

	events[mousedown] = mouseDown;
	events[mousemove] = mouseMove;
	events[mouseup] = mouseUp;
	events[dblclick] = dblClick;
	events["setSeries"] = function (e, src, idx, opts) {
		setSeries(idx, opts);
	};

	var deb;

	if (cursor.show) {
		on(mousedown, over, mouseDown);
		on(mousemove, over, mouseMove);
		on(mouseleave, over, mouseLeave);
		drag.setScale && on(dblclick, over, dblClick);

		deb = debounce(syncRect, 100);

		on(resize, win, deb);
		on(scroll, win, deb);
	}

	// external on/off
	var hooks = self.hooks = opts.hooks || {};

	var evArg0 = [self];

	function fire(evName) {
		if (evName in hooks) {
			var args2 = evArg0.concat(Array.prototype.slice.call(arguments, 1));

			hooks[evName].forEach(function (fn) {
				fn.apply(null, args2);
			});
		}
	}

	(opts.plugins || []).forEach(function (p) {
		for (var evName in p.hooks)
			{ hooks[evName] = (hooks[evName] || []).concat(p.hooks[evName]); }
	});

	var syncOpts = assign({
		key: null,
		setSeries: false,
	}, cursor.sync);

	var syncKey = syncOpts.key;

	var sync = syncKey != null ? (syncs[syncKey] = syncs[syncKey] || _sync()) : _sync();

	sync.sub(self);

	function pub(type, src, x, y, w, h, i) {
		events[type](null, src, x, y, w, h, i);
	}

	self.pub = pub;

	function destroy() {
		sync.unsub(self);
		off(resize, win, deb);
		off(scroll, win, deb);
		root.remove();
		fire("destroy");
	}

	self.destroy = destroy;

	function _init() {
		_setSize(opts[WIDTH], opts[HEIGHT]);

		fire("init", opts, data);

		setData(data || opts.data, false);

		if (pendScales[xScaleKey])
			{ setScale(xScaleKey, pendScales[xScaleKey]); }
		else
			{ autoScaleX(); }

		setSelect(_select, false);

		ready = true;

		fire("ready");
	}

	if (then) {
		if (then instanceof HTMLElement) {
			then.appendChild(root);
			_init();
		}
		else
			{ then(self, _init); }
	}
	else
		{ _init(); }
}

exports.Line = Line;
exports.fmtDate = fmtDate;
exports.rangeNum = rangeNum;
exports.tzDate = tzDate;
