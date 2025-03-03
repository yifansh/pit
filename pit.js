let vol = 0.0;
let mic;
let pitch;
let audioContext;
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
let freq = 200;
let charY = 350;
let ringY;
let ringRadius = 30;
const gridSize = 5;
const minFreq = 130.81;
const maxFreq = 246.94;
const ampThreshold = 0.005;
const maxRingRadius = 100; // 最大サイズを少し大きく
const minRingRadius = 20;
const midDB = 60;
const maxDB = 100;
let obstacles = [];
let effects = [];
let obstacleTimer = 0;
let score = 0;
let combo = 0;

const keyRatio = 0.58;
let currentNote = '';
let colors = [];

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// const noteFrequencies = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];
//const noteFrequencies = [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185., 196., 207.65, 220., 233.08, 246.94];
const noteFrequencies = [130.81, 146.83, 164.81, 185., 207.65, 233.08];

let myFont;

function preload() {
  myFont = loadFont("https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Bold.otf");
}

function setup() {
  createCanvas(800, 400, WEBGL);
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
  background(10, 10, 30);

  let lastFreq = freq;
  let cutFreq = lastFreq;
  if (lastFreq < minFreq) cutFreq = minFreq;
  else if (lastFreq > maxFreq) cutFreq = maxFreq;
  let y = map(Math.log(cutFreq), Math.log(minFreq), Math.log(maxFreq), height - 50, 50);

  // don't move unless it's loud enough
  if (vol > ampThreshold)
    ringY = round(y / gridSize) * gridSize;
  let dB = 80 + 20 * Math.log10(vol + 0.0001);
  if (dB <= maxDB) {
    ringRadius = constrain(map(dB, 0, midDB, minRingRadius, maxRingRadius), minRingRadius, maxRingRadius);
  }

  push();
  translate(100 - width / 2, ringY - height / 2);
  stroke(255, 255, 0);
  // noFill();
  rotateY(-100);
  torus(ringRadius, 5);
  pop();

  if (obstacleTimer > 120) {
    let noteIndex = int(random(notes.length));
    let obsY = map(noteIndex, 0, notes.length - 1, height - 50, 50);
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
      textSize(40);
      fill(255, 0, 0);
      text("GAME OVER", 0, 0);
      noLoop();
    }

    if (obs.x < -obs.w) {
      obstacles.splice(i, 1);
      score += 10 + combo * 2;
      combo++;
      // effects.push(new Effect(100, charY));
    }
  }

  // obstacle.update();
  // obstacle.display();

  fill(255, 255, 255, 80);
  textSize(20);
  text("Score: " + score, 20, 30);
  text("Combo: " + combo, 20, 60);
  text("Freq: " + nf(lastFreq,1,2) + " Hz", 20, 90);
  text("Vol: " + nf(dB,1,2) + " dB", 20, 120);
  
  // for (let i = effects.length - 1; i >= 0; i--) {
  //   let e = effects[i];
  //   e.update();
  //   e.display();
  //   if (e.life <= 0) {
  //     effects.splice(i, 1);
  //   }
  // }
  
}

class Obstacle {
  constructor(x, y, w, h, rot=0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.xSpeed = 3;
    this.rot = rot;    // in DEG
    
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

  collides(rX, rY, rR) {
    // return abs(px - this.x) < this.w / 2 && abs(py - this.y) > pr;
    return abs(this.x - rX) < this.w / (2 * cos(this.rot))
        && abs(this.y - (this.x - rX) * tan(this.rot) - rY) > rR;
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

// class Effect {
//   constructor(x, y) {
//     this.x = x;
//     this.y = y;
//     this.size = 20;
//     this.life = 30;
//   }
  
//   update() {
//     this.size += 3;
//     this.life--;
//   }
  
//   display() {
//     noFill();
//     stroke(255, 100, 200, this.life * 8);
//     ellipse(this.x - width / 2, this.y - height / 2, this.size, this.size);
//   }
// }

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
