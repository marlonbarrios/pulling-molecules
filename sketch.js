
let particles = [];
let maxParticles = 800; // Set the maximum number of particles
let addParticleInterval = 10; // Interval (in frames) for adding new particles
let formationMode = false; // Indicates if the formation behavior is active
let lifeSpan = 1000; // Set the lifespan of each particle
let formationTarget = { x: null, y: null }; // Stores the target position for formation
let mySound; // Variable to store the sound file

// webcam variables
let capture; // our webcam
let captureEvent; // callback when webcam is ready



function preload() {
  soundFormats('mp3', 'wav');
  mySound = loadSound('skhandas.wav'); // Load the sound file
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Create a canvas
  captureWebcam(); // launch webcam
  background(255); // Set the initial background color
  
}

function draw() {
  background(255); // Slightly transparent background for a trail effect

  /* WEBCAM */
  push();
  centerOurStuff(); // center the webcam
  scale(-1, 1); // mirror webcam
  image(capture, -capture.scaledWidth, 0, capture.scaledWidth, capture.scaledHeight); // draw webcam
  scale(-1, 1); // unset mirror
  pop();


  /* TRACKING */
  if (mediaPipe.landmarks[0]) { // is hand tracking ready?

    // index finger
    let indexX = map(mediaPipe.landmarks[0][8].x, 1, 0, 0, capture.scaledWidth);
    let indexY = map(mediaPipe.landmarks[0][8].y, 0, 1, 0, capture.scaledHeight);
    let thumbX = map(mediaPipe.landmarks[0][4].x, 1, 0, 0, capture.scaledWidth);
    let thumbY = map(mediaPipe.landmarks[0][4].y, 0, 1, 0, capture.scaledHeight);
    let pinch = dist(indexX, indexY, thumbX, thumbY);
   
   
    if (pinch <= 50) {

  formationTarget = { x: indexX, y: indexY }; // Update the formation target position
    
  formationMode = true;

  // Update all particles to move towards the new target
  particles.forEach(p => p.setTarget(formationTarget.x, formationTarget.y));
  // Clear the formation mode after a short delay
    }
  
  setTimeout(() => {
    formationMode = false;
    particles.forEach(p => p.clearFormation());
  }, 1000);
  
  }


  // Add a new particle at defined intervals without exceeding the max count
  if (particles.length < maxParticles && frameCount % addParticleInterval === 0) {

    particles.push(new Particle());
  }

  stroke(50); // Semi-transparent black lines for drawing lines between particles
  strokeWeight(3); // Set the line thickness
  // Update and display each particle, and draw lines between them
  for (let i = 0; i < particles.length; i++) {
  
    let p1 = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      let p2 = particles[j];
      let distance = dist(p1.x, p1.y, p2.x, p2.y); // Calculate the distance between particles
      let minDistance = p1.size / 2 + p2.size / 2; // Minimum distance for touching

      if (distance < minDistance) {
        let overlap = (minDistance - distance) / 2;
        p1.x -= (p2.x - p1.x) / distance * overlap;
        p1.y -= (p2.y - p1.y) / distance * overlap;
        p2.x += (p2.x - p1.x) / distance * overlap;
        p2.y += (p2.y - p1.y) / distance * overlap;
      } else if (distance < minDistance + 50) {
        line(p1.x, p1.y, p2.x, p2.y);
       
      }
    }
    p1.update();
    p1.display();
  
  
  }


  noStroke(); // Reset stroke settings for other drawing operations
  // Filter out particles that have "died"
  particles = particles.filter(particle => particle.lifespan > 0);
 
}

// Adjust canvas size when the window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}



// Handle key press events for sound playback control
function keyPressed() {
  if (key === 'p' || key === 'P') {
    if (mySound.isPlaying()) {
      mySound.stop();
    } else {
      mySound.play();
      mySound.setVolume(0.1);
      mySound.loop();
    }
  }
}


/* - - Helper functions - - */

// function: launch webcam
function captureWebcam() {
  capture = createCapture(
    {
      audio: false,
      video: {
        facingMode: "user",
      },
    },
    function (e) {
      captureEvent = e;
      console.log(captureEvent.getTracks()[0].getSettings());
      // do things when video ready
      // until then, the video element will have no dimensions, or default 640x480
      capture.srcObject = e;

      setCameraDimensions(capture);
      mediaPipe.predictWebcam(capture);
      //mediaPipe.predictWebcam(parentDiv);
    }
  );
  capture.elt.setAttribute("playsinline", "");
  capture.hide();
}

// function: resize webcam depending on orientation
function setCameraDimensions(video) {

  const vidAspectRatio = video.width / video.height; // aspect ratio of the video
  const canvasAspectRatio = width / height; // aspect ratio of the canvas

  if (vidAspectRatio > canvasAspectRatio) {
    // Image is wider than canvas aspect ratio
    video.scaledHeight = height;
    video.scaledWidth = video.scaledHeight * vidAspectRatio;
  } else {
    // Image is taller than canvas aspect ratio
    video.scaledWidth = width;
    video.scaledHeight = video.scaledWidth / vidAspectRatio;
  }
}


// function: center our stuff
function centerOurStuff() {
  translate(width / 2 - capture.scaledWidth / 2, height / 2 - capture.scaledHeight / 2); // center the webcam
}

// Particle class definition and methods...
class Particle {
  constructor() {
    this.setInitialPosition();
    this.size = random(10, 50);
    this.vx = this.x < width / 2 ? random(0.5, 2) : random(-2, -0.5);
    this.vy = this.y < height / 2 ? random(0.5, 2) : random(-2, -0.5);
    this.color = [random(200), random(200), random(50, 200)];
    this.lifespan = random(200, 10000);
    this.curveFactor = random(-0.05, 0.05);
    this.inFormation = false;
    this.target = { x: null, y: null };
  }

  setInitialPosition() {
    let edge = floor(random(4));
    switch (edge) {
      case 0: this.x = random(width); this.y = 0; break;
      case 1: this.x = width; this.y = random(height); break;
      case 2: this.x = random(width); this.y = height; break;
      case 3: this.x = 0; this.y = random(height); break;
    }
  }

  update() {
    if (this.inFormation) {
      let angleToTarget = atan2(this.target.y - this.y, this.target.x - this.x);
      this.vx = cos(angleToTarget) * 1.5;
      this.vy = sin(angleToTarget) * 1.5;
    } else {
      this.vx += cos(frameCount * 0.02) * this.curveFactor;
      this.vy += sin(frameCount * 0.02) * this.curveFactor;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= 0 || this.x >= width) this.vx *= -1;
    if (this.y <= 0 || this.y >= height) this.vy *= -1;

    this.lifespan--;
  }

  display() {
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }

  setTarget(x, y) {
    this.target = {x: x, y: y};
    this.inFormation = true;
  }

  clearFormation() {
    this.inFormation = false;
    this.target = { x: null, y: null };
  }
}
