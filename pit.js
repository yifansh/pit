let vol = 0.0;
let mic, amplitude;
let pitch;
let audioContext;
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
let freq = 200;
let charY = 350;
let ringY;
let ringRadius = 30;
const gridSize = 5;
const minFreq = 115.;
const maxFreq = 261.63;
const ampThreshold = 0.07;
const maxRingRadius = 100; // 最大サイズを少し大きく
const minRingRadius = 40;
const midDB = 40;
const maxDB = 100;
let obstacles = [];
let effects = [];
let obstacleTimer = 0;
let score = 0;
let combo = 0;

const keyRatio = 0.58;
let currentNote = '';
let colors = [];

let messages = [];

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
//const noteFrequencies = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392., 415.30, 440., 466.16, 493.88];
//const noteFrequencies = [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185., 196., 207.65, 220., 233.08, 246.94];
const noteFrequencies = [130.81, 146.83, 164.81, 185., 207.65, 233.08];

let myFont;

function preload() {
  myFont = loadFont("https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Bold.otf");
  factoryBg = loadImage("factory.jpeg"); 
}

function setup() {
  createCanvas(800, 500, WEBGL);
  angleMode(DEGREES);
  normalMaterial();
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);
  charY = height / 2;
  ringY = height / 2;
  textFont(myFont);
}

function startPitch() {
  pitch = ml5.pitchDetection(model_url, audioContext, mic.stream, modelLoaded);
}

//Load the model and get the pitch
function modelLoaded() {
  select('#status').html('Model Loaded');
  getPitch();
}

//Draw on the canvas
function draw() {
  // background(0);
  background(255);

  push();
  translate(0,0,-200);        // Switch to orthographic projection (flat 2D)
  imageMode(CENTER);
  image(factoryBg, 0, 0, width * 1.3, height * 1.3);
  pop(); // Restore 3D mode

  let lastFreq = freq;
  let cutFreq = constrain(lastFreq, minFreq, maxFreq);
  let y = map(Math.log(cutFreq), Math.log(minFreq), Math.log(maxFreq), height - 50, 50);

  // don't move unless it's loud enough
  if (vol > ampThreshold)
    ringY = round(y / gridSize) * gridSize;
  let dB = 500 * Math.log10(vol + 1);
  ringRadius = constrain(map(dB, midDB, maxDB, minRingRadius, maxRingRadius), minRingRadius, maxRingRadius);

  push();
  translate(100 - width / 2, ringY - height / 2);
  stroke(0, 0, 255);
  // noFill();
  rotateY(-100);
  torus(ringRadius, 5);
  pop();

  if (obstacleTimer > 220) {
    let noteIndex = int(random(notes.length));
    let obsY = map(noteIndex, 0, notes.length - 1, height - 100, 100);
    let obstacle = new Obstacle(width, obsY, 200, 10, random(-1, 1) > 0 ? 0 : (random(-1, 1) > 0 ? random(10, 25) : random(-25, -10)));//, 30, 0.05);
    obstacles.push(obstacle);
    obstacleTimer = 0;
  }
  obstacleTimer++;
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.update();
    obs.display();

    if (obs.collides(100, ringY, ringRadius)) {
      // textSize(40);
      // fill(255, 0, 0);
      // text("GAME OVER", 0, 0);
      // noLoop();
    }

    if (obs.x < -obs.w) {
      obstacles.splice(i, 1);
      score += 10 + combo * 2;
      combo++;
    }

    for (let i = messages.length - 1; i >= 0; i--) {
      let msg = messages[i];
      let elapsed = millis() - msg.timestamp;
  
      if (elapsed > 1000) {
        messages.splice(i, 1); // Remove after 1 second
        continue;
      }
  
      // Pop-out animation: scale up and fade out
      let scaleFactor = map(elapsed, 0, 500, 1.5, 1); // Shrinks from 1.5 to 1
      let alpha = map(elapsed, 700, 1000, 255, 0); // Fade out in last 300ms
  
      push();
      translate(200, 0);
      scale(scaleFactor);
      fill(msg.color[0], msg.color[1], msg.color[2], alpha);
      textSize(50);
      text(msg.text, 0, 0);
      pop();
    }
  }

  // fill(255, 255, 255, 0);
  push();
  translate(200, 70);
  textSize(20);
  text("Score: " + score, 20, 30);
  text("Combo: " + combo, 20, 60);
  text("Freq: " + nf(lastFreq,1,2) + " Hz", 20, 90);
  text("Vol: " + nf(dB,1,2) + " dB", 20, 120);
  pop();
  
}

function showMessage(type) {
  let colorMap = {
    "PERFECT": [0, 255, 0],   // Green
    "GREAT": [0, 150, 255],   // Blue
    "GOOD": [255, 200, 0],    // Yellow
    "MISS": [150, 150, 150]   // Gray
  };

  messages.push({
    text: type,
    timestamp: millis(),
    color: colorMap[type] || [255, 255, 255]
  });
}

class Obstacle {
  constructor(x, y, w, h, rot=0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.xSpeed = 3;
    this.rot = rot;    // in DEG
    this.scoreIn = 0;
    this.scoreOut = 0;
    this.hasIn = false;
    this.hasOut = false;
    this.missed = false;
    
    // this.lyric = lyric;
  }
  
  update() {
    this.x -= this.xSpeed;
  }
  
  display() {
    push();
    translate(this.x - width / 2, this.y - height / 2);
    stroke(255, 0, 0);
    fill(255, 0, 0, 180);
    rotateZ(90 + this.rot);
    cylinder(10, this.w);
    pop();
  }

  inSide(rX) {
    return abs(this.x - rX) < this.w / (2 * cos(this.rot));
  }

  collides(rX, rY, rR) {
    // return abs(px - this.x) < this.w / 2 && abs(py - this.y) > pr;  // rot=0のとき
    if (!this.inSide(rX)) {
      if (!this.hasOut && this.hasIn) {
        this.hasOut = true;
        let dist = abs(this.y - (this.x - rX) * tan(this.rot) - rY);
        if (dist > rR) {}
        else if (dist < 20)
          showMessage("PERFECT"); // perfect
        else if (dist < 40)
          showMessage("GREAT"); // great
        else
          showMessage("GOOD"); // good
      }
      return false;
    }
    if (this.missed) {
      return true;
    }
    let dist = abs(this.y - (this.x - rX) * tan(this.rot) - rY);
    if (dist > rR) {
      this.missed = true;
      showMessage("MISS");
      return true;
    }
    if (this.hasIn)
      return false;
    this.hasIn = true;
    if (dist < 20)
      showMessage("PERFECT"); // perfect
    else if (dist < 40)
      showMessage("GREAT"); // great
    else
      showMessage("GOOD"); // good
    return false;
  }
}

class SineObstacle extends Obstacle {
  constructor(x, y, w, h, amp, freq, rot=0) {
    super(x, y, w, h, rot);
    this.amp = amp;
    this.freq = freq;
    this._y = y;
    this.xSpeed = 5;
  }

  update() {
    this.x -= this.xSpeed;
    this.y = this._y + Math.sin(frameCount * this.freq) * this.amp;
  }
}

//Get the pitch, find the closest note and set the fill color
function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) {
      freq = frequency;
      vol = mic.getLevel();
      let midiNum = freqToMidi(freq);
      currentNote = notes[midiNum % 12];
      select('#noteAndVolume').html('Note: ' + currentNote + " - volume " + nf(vol,1,2));
    }
    getPitch();
  })
}

function mousePressed() {
  userStartAudio();
}

function keyPressed() {
  let types = ["PERFECT", "GREAT", "GOOD", "MISS"];
  showMessage(random(types));
}
