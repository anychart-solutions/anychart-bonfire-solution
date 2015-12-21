var stage;
var fireLayer, smokeLayer, fireplaceLayer;
var stoneHighlightPath;

var NUMBER_OF_FIRES = 60;
var NUMBER_OF_SMOKES = 10;
var TOP_Z_INDEX = 100;
var FIRE_LIFETIME = 2000;
var SMOKE_LIFETIME = 7000;
var FIRES_PERIOD = Math.round(FIRE_LIFETIME / NUMBER_OF_FIRES); //ms
var SMOKE_PERIOD = Math.round(SMOKE_LIFETIME / NUMBER_OF_SMOKES);
var FPS = 50;
var FIRE_RECT_SIDE = 100;
var SMOCK_RECT_SIDE = 80;
var fires = [];
var smokes = [];
var stageInterval;
var addFireInterval, addSmokeInterval;

var g = anychart.graphics;

anychart.onDocumentReady(function() {
  stage = g.create('container');
  smokeLayer = stage.layer();
  fireLayer = stage.layer();
  fireplaceLayer = stage.layer();
  stage.suspend();

  decorateFireplace();

  var interval = 1000 / FPS;

  addFireInterval = setInterval(addFire, FIRES_PERIOD);
  addSmokeInterval = setInterval(addSmoke, SMOKE_PERIOD);
  stageInterval = setInterval(runStage, interval);

});

function decorateFireplace() {
  var bounds = stage.getBounds();
  var centerX = bounds.left + bounds.width / 2;
  var top = bounds.top + bounds.height;
  var stones = fireplaceLayer.path();
  stones
      .fill('#090909');

  var side = bounds.width;

  stones
      .moveTo(centerX - 250, top)
      .lineTo(centerX + 250, top)
      .lineTo(centerX + 200, top - 40)
      .lineTo(centerX + 150, top - 25)
      .lineTo(centerX + 100, top - 35)
      .lineTo(centerX + 50, top - 15)
      .lineTo(centerX, top - 25)
      .lineTo(centerX - 50, top - 15)
      .lineTo(centerX - 100, top - 35)
      .lineTo(centerX - 150, top - 25)
      .lineTo(centerX - 200, top - 40)
      .lineTo(centerX - 250, top)
      .close();

  stoneHighlightPath = fireplaceLayer.path();
  stoneHighlightPath
      .moveTo(centerX + 200, top - 40)
      .lineTo(centerX + 150, top - 25)
      .lineTo(centerX + 100, top - 35)
      .lineTo(centerX + 50, top - 15)
      .lineTo(centerX, top - 25)
      .lineTo(centerX - 50, top - 15)
      .lineTo(centerX - 100, top - 35)
      .lineTo(centerX - 150, top - 25)
      .lineTo(centerX - 200, top - 40)
      .stroke('#ff9900', .3);
}

function addFire() {
  if (fires.length < NUMBER_OF_FIRES) {
    var firePath = fireLayer.path().stroke(null);
    var fire = new GraphicsWrapper(firePath, fires, FIRE_RECT_SIDE, 255, 255, 0, fireRedConverter, fireGreenConverter,
        fireBlueConverter, getFireStartPoint, fireDeltaXGetter, fireDeltaYGetter, animateFire, animateFireOpacity,
        fireScaleGetter);
    fires.push(fire);
  } else {
    clearInterval(addFireInterval);
  }
}

function addSmoke() {
  if (smokes.length < NUMBER_OF_FIRES) {
    var smokePath = smokeLayer.path().stroke(null);
    var smoke = new GraphicsWrapper(smokePath, smokes, SMOCK_RECT_SIDE, 80, 80, 80, smokeRedConverter, smokeGreenConverter,
        smokeBlueConverter, getSmokeStartPoint, smokeDeltaXGetter, smokeDeltaYGetter, animateSmoke, animateSmokeOpacity,
        smokeScaleGetter);
    smokes.push(smoke);
  } else {
    clearInterval(addSmokeInterval);
  }
}


function runStage() {
  for (var i = 0; i < fires.length; i++) {
    var fireWrapper = fires[i];
    fireWrapper.stepPosition();
    fireWrapper.drawCurrentState();
  }

  for (i = 0; i < smokes.length; i++) {
    var smokeWrapper = smokes[i];
    smokeWrapper.stepPosition();
    smokeWrapper.drawCurrentState();
  }
  stage.resume();
  stage.suspend();
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

  this.start = (new Date()).getTime();

};


GraphicsWrapper.prototype.stepPosition = function() {
  var now = (new Date()).getTime();
  var timeRatio = Math.min(1, (now - this.start) / FIRE_LIFETIME);
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
      stoneHighlightPath.stroke('#ff9900', .3 + .7 * Math.random()); //Here we will get pretty random highlighting.
    }
  }
}

function getFireStartPoint() {
  var bounds = stage.getBounds();
  var x = bounds.width / 8;
  var y = bounds.height / 5;
  var left = bounds.left + Math.round(bounds.width / 2 + plusMinusRandom(x));
  var top = bounds.top + Math.round(bounds.height - y * Math.random());
  return new g.math.Coordinate(left, top);
}

function getSmokeStartPoint() {
  var bounds = stage.getBounds();
  var x = bounds.width / 6;
  var y = bounds.height / 4;
  var left = bounds.left + Math.round(bounds.width / 2 + plusMinusRandom(x));
  var top = bounds.top + Math.round(bounds.height - y * Math.random());
  return new g.math.Coordinate(left, top);
}

function fireDeltaXGetter() {
  var b = stage.getBounds();
  return plusMinusRandom(b.width / 6);
}

function smokeDeltaXGetter() {
  var b = stage.getBounds();
  return plusMinusRandom(b.width / 6);
}

function fireDeltaYGetter() {
  var b = stage.getBounds();
  return -Math.round(b.height * .6 + plusMinusRandom(b.height / 4));
}

function smokeDeltaYGetter() {
  var b = stage.getBounds();
  return -Math.round(b.height * .6 + plusMinusRandom(b.height / 4));
}

function fireScaleGetter(position) {
  return .3 + .7 * (1 - position);
}

function smokeScaleGetter(position) {
  return 1 + position;
}