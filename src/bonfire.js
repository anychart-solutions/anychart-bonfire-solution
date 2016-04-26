var stage;
var fireLayer, smokeLayer, fireplaceLayer;
var stones, stoneHighlightPath;

var NUMBER_OF_FIRES = 60;
var NUMBER_OF_SMOKES = 60;
var TOP_Z_INDEX = 100;
var FIRE_LIFETIME = 2000; //ms
var SMOKE_LIFETIME = 2000;
var FIRES_PERIOD = 33; //ms
var SMOKE_PERIOD = 50;
var FIRE_RECT_SIDE;
var SMOKE_RECT_SIDE;
var fires = [];
var smokes = [];
var DEFAULT_FRAME_INTERVAL = 16;


var allowFire = true;
var allowSmoke = true;

var g = anychart.graphics;

function lockFire() {
  if (allowFire) {
    allowFire = false;
    setTimeout(function() {
      allowFire = true;
    }, FIRES_PERIOD)
  }
}


function lockSmoke() {
  if (allowSmoke) {
    allowSmoke = false;
    setTimeout(function() {
      allowSmoke = true;
    }, SMOKE_PERIOD)
  }
}


anychart.onDocumentReady(function() {
  window.requestAnimationFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        console.log('Warn: old browser');
        setTimeout(callback, DEFAULT_FRAME_INTERVAL);
      };

  stage = g.create('container');
  smokeLayer = stage.layer();
  fireLayer = stage.layer();
  fireplaceLayer = stage.layer();
  stoneHighlightPath = fireplaceLayer.path();
  stones = fireplaceLayer.path();

  stage.addEventListener('stageresize', decorateFireplace, false, this);

  stage.suspend();
  decorateFireplace();
  draw();
  stage.resume();
});

function draw() {
  if (fires.length < NUMBER_OF_FIRES) addFire();
  if (smokes.length < NUMBER_OF_SMOKES) addSmoke();
  runStage();
  window.requestAnimationFrame(draw);
}


function decorateFireplace() {
  var bounds = stage.getBounds();

  FIRE_RECT_SIDE = Math.round(bounds.height / 20);
  SMOKE_RECT_SIDE = Math.round(0.8 * FIRE_RECT_SIDE);

  var centerX = bounds.left + bounds.width / 2;
  var bottom = bounds.top + bounds.height;
  var top = bounds.top + Math.round(bounds.height / 1.7);
  stones.clear();
  stoneHighlightPath.clear();

  stones.fill('#000');

  var w = FIRE_RECT_SIDE * 5;
  var count = 20;
  var step = 2 * w / count;
  var left = centerX + w;
  stones.moveTo(centerX - w, bottom)
      .lineTo(left, bottom)
      .lineTo(left, top);
  stoneHighlightPath.moveTo(left, top);
  var mult = 1;

  for (var i = 0; i < count; i++) {
    left -= step;
    var t = top + (mult * 2);
    mult = -mult;
    stones.lineTo(left, t);
    stoneHighlightPath.lineTo(left, t);
  }

  stones.close();
}

function addFire() {
  if (allowFire) {
    var firePath = fireLayer.path().stroke(null);
    var fire = new GraphicsWrapper(firePath, fires, FIRE_RECT_SIDE, 255, 255, 0, fireRedConverter, fireGreenConverter,
        fireBlueConverter, getFireStartPoint, fireDeltaXGetter, fireDeltaYGetter, animateFire, animateFireOpacity,
        fireScaleGetter);
    fire.isFire = true;
    fires.push(fire);
    lockFire();
  }
}

function addSmoke() {
  if (allowSmoke) {
    var smokePath = smokeLayer.path().stroke(null);
    var smoke = new GraphicsWrapper(smokePath, smokes, SMOKE_RECT_SIDE, 80, 80, 80, smokeRedConverter, smokeGreenConverter,
        smokeBlueConverter, getSmokeStartPoint, smokeDeltaXGetter, smokeDeltaYGetter, animateSmoke, animateSmokeOpacity,
        smokeScaleGetter);
    smoke.isFire = false;
    smokes.push(smoke);
    lockSmoke();
  }
}


function runStage() {
  stage.suspend();
  for (var i = 0; i < fires.length; i++) {
    var fireWrapper = fires[i];
    fireWrapper.stepPosition(DEFAULT_FRAME_INTERVAL);
    fireWrapper.drawCurrentState();
  }

  for (i = 0; i < smokes.length; i++) {
    var smokeWrapper = smokes[i];
    smokeWrapper.stepPosition(DEFAULT_FRAME_INTERVAL);
    smokeWrapper.drawCurrentState();
  }
  stage.resume();
}


function GraphicsWrapper(path, itemsScope, initialSize, red, green, blue, redConverter, greenConverter, blueConverter,
                         startPointGetter, deltaXGetter, deltaYGetter, positionGetter, opacityGetter, scaleGetter) {
  this.path = path;
  this.itemsScope = itemsScope;
  this.initialSize = initialSize;

  this.red = red;
  this.green = green;
  this.blue = blue;

  this.getRedColor = redConverter;
  this.getGreenColor = greenConverter;
  this.getBlueColor = blueConverter;
  this.getStartPoint = startPointGetter;
  this.getDeltaX = deltaXGetter;
  this.getDeltaY = deltaYGetter;
  this.getPosition = positionGetter;
  this.getOpacity = opacityGetter;
  this.getScale = scaleGetter;

  this.reset();
}


GraphicsWrapper.prototype.reset = function() {
  this.position = 0;
  this.opacityPosition = 0;
  this.color = rgbToHex(this.red, this.green, this.blue);

  var startCoord = this.getStartPoint();

  this.startX = startCoord.x;
  this.startY = startCoord.y;

  this.zIndex = TOP_Z_INDEX;

  reduceZIndex(this.itemsScope, this);

  this.deltaX = this.getDeltaX();
  this.deltaY = this.getDeltaY();

  this.path
      .clear()
      .moveTo(this.startX, this.startY - this.initialSize)
      .lineTo(this.startX + this.initialSize, this.startY)
      .lineTo(this.startX, this.startY + this.initialSize)
      .lineTo(this.startX - this.initialSize, this.startY)
      .close();

  this.numericPos = 0;
};


GraphicsWrapper.prototype.stepPosition = function(add) {
  var lifetime = this.isFire ? FIRE_LIFETIME : SMOKE_LIFETIME;
  this.numericPos += add;
  var timeRatio = Math.min(1, this.numericPos / lifetime);
  this.position = this.getPosition(timeRatio);
  this.opacityPosition = this.getOpacity(timeRatio);
};


GraphicsWrapper.prototype.drawCurrentState = function() {
  var scale = this.getScale(this.position);
  var size = this.initialSize * scale;

  var trX = this.startX + this.position * this.deltaX;
  var trY = this.startY + this.position * this.deltaY;

  var red = this.getRedColor(this.red, this.position);
  var green = this.getGreenColor(this.green, this.position);
  var blue = this.getBlueColor(this.blue, this.position);
  this.color = rgbToHex(red, green, blue);

  this.path
      .clear()
      .moveTo(trX, trY - size)
      .lineTo(trX + size, trY)
      .lineTo(trX, trY + size)
      .lineTo(trX - size, trY)
      .close()
      .fill({color: this.color, opacity: 1 - this.opacityPosition})
      .zIndex(this.zIndex);

  if (this.position == 1) this.reset();
};


function animateFire(timeRatio) {
  return Math.pow(timeRatio, 2);
  //return Math.pow(timeRatio, 5);
  //return 1 - Math.sin(Math.acos(timeRatio));
}

function animateSmoke(timeRatio) {
  return timeRatio;
}

function animateFireOpacity(timeRatio) {
  //return Math.pow(timeRatio, 2);
  //return Math.pow(timeRatio, 5);
  return 1 - Math.sin(Math.acos(timeRatio));
}

function animateSmokeOpacity(timeRatio) {
  return Math.pow(timeRatio, 2);
}

function fireRedConverter(red, position) {
  return red;
}

function smokeRedConverter(red, position) {
  return red * (1 - .5 * position);
}

function fireGreenConverter(green, position) {
  return 55 + 200 * (1 - position);
}

function smokeGreenConverter(green, position) {
  return green * (1 - .5 * position);
}

function fireBlueConverter(blue, position) {
  return blue;
}

function smokeBlueConverter(blue, position) {
  return blue * (1 - .5 * position);
}


function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

function plusMinusRandom(val) {
  return Math.round(val - 2 * val * Math.random());
}

function reduceZIndex(scope, source) {
  for (var i = 0; i < scope.length; i++) {
    var item = scope[i];
    if (source != item) {
      item.zIndex = item.zIndex - 1;
    } else {
      stoneHighlightPath.stroke('#ffaa55', .3 + .7 * Math.random()); //Here we will get pretty random highlighting.
    }
  }
}

function getFireStartPoint() {
  var bounds = stage.getBounds();
  var x = FIRE_RECT_SIDE * 2;
  var y = FIRE_RECT_SIDE;
  var left = bounds.left + Math.round(bounds.width / 2 + plusMinusRandom(x));
  var top = bounds.top + Math.round(bounds.height / 1.7 + y * Math.random());
  return new g.math.Coordinate(left, top);
}

function getSmokeStartPoint() {
  var bounds = stage.getBounds();
  var x = SMOKE_RECT_SIDE * 2;
  var y = SMOKE_RECT_SIDE * 2;
  var left = bounds.left + Math.round(bounds.width / 2 + plusMinusRandom(x));
  var top = bounds.top + Math.round(bounds.height / 1.7 - y * Math.random());
  return new g.math.Coordinate(left, top);
}

function fireDeltaXGetter() {
  return plusMinusRandom(FIRE_RECT_SIDE * 2);
}

function smokeDeltaXGetter() {
  return plusMinusRandom(SMOKE_RECT_SIDE * 4);
}

function fireDeltaYGetter() {
  return -5 * FIRE_RECT_SIDE;
}

function smokeDeltaYGetter() {
  return fireDeltaYGetter();
}

function fireScaleGetter(position) {
  return .3 + .7 * (1 - position);
}

function smokeScaleGetter(position) {
  return 1 + position;
}