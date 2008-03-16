//=====================================================================
// Accel[erated] [an]imation object
// change a property of an object over time in an accelerated fashion
//=====================================================================
// obj  : reference to the object whose property you'd like to animate
// prop : property you would like to change eg: "left"
// to   : final value of prop
// time : time the animation should take to run
// zip    : optional. specify the zippiness of the acceleration. pick a
//          number between -1 and 1 where -1 is full decelerated, 1 is
//          full accelerated, and 0 is linear (no acceleration). default
//          is 0.
// unit    : optional. specify the units for use with prop. default is
//          "px".
//=====================================================================

function Accelimation(obj, prop, to, time, zip, unit) {
  if (typeof zip  == "undefined") zip  = 0;
  if (typeof unit == "undefined") unit = "px";

  // NOTE: unlocalised string
  if (zip > 2 || zip <= 0)
    throw new Error("Illegal value for zip. Must be less than or equal to 2 and greater than 0.");

  this.obj = obj;
  this.prop = prop;
  this.x1 = to;
  this.dt = time;
  this.zip = zip;
  this.unit = unit;

  this.x0 = parseInt(this.obj[this.prop]);
  this.D = this.x1 - this.x0;
  this.A = this.D / Math.abs(Math.pow(time, this.zip));
  this.id = Accelimation.instances.length;
  this.onend = null;
};

//=====================================================================
// public methods
//=====================================================================

// after you create an accelimation, you call this to start it-a runnin'
Accelimation.prototype.start = function() {
  this.t0 = new Date().getTime();
  this.t1 = this.t0 + this.dt;
  var dx = this.x1 - this.x0;
  Accelimation._add(this);
};

// and if you need to stop it early for some reason...
Accelimation.prototype.stop = function() {
  Accelimation._remove(this);
};


//=====================================================================
// private methods
//=====================================================================

// paints one frame. gets called by Accelimation._paintAll.
Accelimation.prototype._paint = function(time) {
  if (time < this.t1) {
    var elapsed = time - this.t0;
    this.obj[this.prop] = Math.abs(Math.pow(elapsed, this.zip)) * this.A + this.x0 + this.unit;
  }
  else this._end();
};

// ends the animation
Accelimation.prototype._end = function() {
  Accelimation._remove(this);
  this.obj[this.prop] = this.x1 + this.unit;
  this.onend();
};

//=====================================================================
// static methods (all private)
//=====================================================================

// add a function to the list of ones to call periodically
Accelimation._add = function(o) {
  var index = this.instances.length;
  this.instances[index] = o;
  // if this is the first one, start the engine
  if (this.instances.length == 1) {
    this.timerID = window.setInterval("Accelimation._paintAll()", this.targetRes);
  }
};

// remove a function from the list
Accelimation._remove = function(o) {
  for (var i = 0; i < this.instances.length; i++) {
    if (o == this.instances[i]) {
      this.instances = this.instances.slice(0,i).concat( this.instances.slice(i+1) );
      break;
    }
  }
  // if that was the last one, stop the engine
  if (this.instances.length == 0) {
    window.clearInterval(this.timerID);
    this.timerID = null;
  }
};

// "engine" - call each function in the list every so often
Accelimation._paintAll = function() {
  var now = new Date().getTime();
  for (var i = 0; i < this.instances.length; i++) {
    // small chance that this accelimation could get dropped in the queue in the middle
    // of a run. That means that it could have a t0 greater than "now", which means that
    // elapsed would be negative.
    this.instances[i]._paint(Math.max(now, this.instances[i].t0));
  }
};

//=====================================================================
// static properties
//=====================================================================

Accelimation.instances = [];
Accelimation.targetRes = 10;
Accelimation.timerID = null;
