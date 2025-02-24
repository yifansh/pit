let vol = 0.0;
let mic;
let pitch;
let audioContext;
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
let freq = 200;
let charY = 350;
const gridSize = 5;
const minFreq = 261.63;
const maxFreq = 493.88;
const ampThreshold = 0.02;
let obstacles = [];
let effects = [];
let obstacleTimer = 0;
let score = 0;
let combo = 0;

const keyRatio = 0.58;
let currentNote = '';
let colors = [];

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteFrequencies = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];

let myFont;

function preload() {
  myFont = loadFont("https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Bold.otf");
}

function setup() {
  createCanvas(800, 400, WEBGL);
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);
  charY = height / 2;
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
    charY = round(y / gridSize) * gridSize;

  push();
  translate(-width / 2 + 100, charY - height / 2, 0);
  noStroke();
  fill(0, 255, 150);
  sphere(20);
  stroke(0, 255, 200);
  noFill();
  ellipse(0, 0, 50, 50);
  pop();
  
  if (obstacleTimer > 60) {
    let noteIndex = int(random(notes.length));
    let obstacleY = map(noteIndex, 0, notes.length - 1, height - 50, 50);
    obstacles.push(new Obstacle(width, obstacleY, 100, 20, notes[noteIndex]));
    obstacleTimer = 0;
  }
  obstacleTimer++;
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.update();
    obs.display();
    if (dist(100, charY, obs.x, obs.y) < 50) {
      textSize(40);
      fill(255, 0, 0);
      text("GAME OVER", 100, 100);
      noLoop();
    }
    if (obs.x < -obs.w) {
      obstacles.splice(i, 1);
      score += 10 + combo * 2;
      combo++;
      effects.push(new Effect(100, charY));
    }
  }
  
  for (let i = effects.length - 1; i >= 0; i--) {
    let e = effects[i];
    e.update();
    e.display();
    if (e.life <= 0) {
      effects.splice(i, 1);
    }
  }
  
  fill(255);
  textSize(20);
  text("Score: " + score, -width / 2 + 20, -height / 2 + 30);
  text("Combo: " + combo, -width / 2 + 20, -height / 2 + 60);
  text("Freq: " + nf(lastFreq,1,2) + " Hz", -width / 2 + 20, -height / 2 + 90);
}

class Obstacle {
  constructor(x, y, w, h, lyric) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.speed = 5;
    this.lyric = lyric;
  }
  
  update() {
    this.x -= this.speed;
  }
  
  display() {
    push();
    translate(this.x - width / 2, this.y - height / 2, 0);
    stroke(255, 100, 100);
    fill(255, 0, 0, 180);
    rect(-this.w / 2, -this.h / 2, this.w, this.h);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(this.lyric, 0, 0);
    pop();
  }
}

class Effect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.life = 30;
  }
  
  update() {
    this.size += 3;
    this.life--;
  }
  
  display() {
    noFill();
    stroke(255, 100, 200, this.life * 8);
    ellipse(this.x - width / 2, this.y - height / 2, this.size, this.size);
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
