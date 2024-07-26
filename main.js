class Screen {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.canvas.width = width;
    this.canvas.height = height;
  }
}

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  subtract(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  multiply(other) {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  multiplyScaler(other) {
    return new Vector(this.x * other, this.y * other);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normal() {
    const invLength = 1 / this.length();
    return new Vector(this.x * invLength, this.y * invLength);
  }
}

class Particle {
  constructor(position) {
    this.position = position;
    this.positionLast = this.position.clone();
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }

  applyImpulse(force) {
    this.position = this.position.add(force);
  }

  applyForce(force) {
    this.acceleration = this.acceleration.add(force);
  }

  update(deltaTime) {
    this.velocity = this.position.subtract(this.positionLast);
    this.positionLast = this.position.clone();
    this.position = this.position.add(this.velocity).add(this.acceleration.multiplyScaler(deltaTime * deltaTime));
    this.acceleration = new Vector();
  }
}

class Constraint {
  constructor(particle0, particle1, length, stiffness) {
    this.particle0 = particle0;
    this.particle1 = particle1;
    this.length = length;
    this.stiffness = stiffness;
  }

  update() {
    const d = this.particle0.position.subtract(this.particle1.position);
    const f = d.normal().multiplyScaler(0.5 * this.stiffness * (d.length() - this.length));
    this.particle0.applyImpulse(f.multiplyScaler(-1));
    this.particle1.applyImpulse(f.multiplyScaler(1));
  }
}

class Solver {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.deltaTime = 1 / 60;
    this.gravity = new Vector();
    this.borderFriction = 0;

    this.boundsMargin = 0;

    this.particles = [];
    this.constraints = [];

    this.onUpdate = undefined;
  }

  applyGravity() {
    this.particles.forEach(particle => particle.applyForce(this.gravity));
  }

  updatePositions() {
    this.particles.forEach(particle => particle.update(this.deltaTime));
  }

  applyBounds() {
    this.particles.forEach(particle => {
      if (particle.position.x < this.boundsMargin) {
        particle.position.x = this.boundsMargin;
        particle.positionLast.x = particle.position.x;
        particle.positionLast.y = particle.position.y - particle.velocity.y*(1-this.borderFriction);
      }
      if (particle.position.x > this.width-this.boundsMargin) {
        particle.position.x = this.width-this.boundsMargin;
        particle.positionLast.x = particle.position.x;
        particle.positionLast.y = particle.position.y - particle.velocity.y*(1-this.borderFriction);
      }
      if (particle.position.y < this.boundsMargin) {
        particle.position.y = this.boundsMargin;
        particle.positionLast.y = particle.position.y;
        particle.positionLast.x = particle.position.x - particle.velocity.x*(1-this.borderFriction);
      }
      if (particle.position.y > this.height-this.boundsMargin) {
        particle.position.y = this.height-this.boundsMargin;
        particle.positionLast.y = particle.position.y;
        particle.positionLast.x = particle.position.x - particle.velocity.x*(1-this.borderFriction);
      }
    });
  }

  updateConstraints() {
    this.constraints.forEach(constraint => constraint.update());
  }

  step() {
    this.applyGravity();
    this.updatePositions();
    this.applyBounds();
    this.updateConstraints();
  }
}

class Renderer {
  constructor(screen, particles, constraints) {
    this.screen = screen;
    this.particles = particles;
    this.constraints = constraints;

    this.particleRadius = 5;
  }

  render() {
    this.screen.ctx.fillStyle = '#293148';
    this.screen.ctx.fillRect(0, 0, this.screen.canvas.width, this.screen.canvas.height);
    this.screen.ctx.fillStyle = '#fff';
    this.screen.ctx.strokeStyle = '#f33';
    this.screen.ctx.lineWidth = 2;
    this.constraints.forEach(constraint => {
      this.screen.ctx.beginPath();
      this.screen.ctx.moveTo(constraint.particle0.position.x, constraint.particle0.position.y);
      this.screen.ctx.lineTo(constraint.particle1.position.x, constraint.particle1.position.y);
      this.screen.ctx.stroke();
    });
    this.particles.forEach(particle => {
      this.screen.ctx.fillRect(particle.position.x - this.particleRadius, particle.position.y - this.particleRadius, this.particleRadius * 2, this.particleRadius * 2);
    });
  }
}

class InputHandler {
  constructor(screen) {
    this.screen = screen;
    this.mouse = {
      position: new Vector(),
      down: false 
    }

    window.addEventListener('mousedown', e => {
      this.mouse.down = true;
    });

    window.addEventListener('mouseup', e => {
      this.mouse.down = false;
    });
    window.addEventListener('mousemove', e => {
      this.mouse.position.x = e.clientX;
      this.mouse.position.y = e.clientY;
    });
  }
}

class InteractionHandler {
  constructor(screen, solver) {
    this.screen = screen;
    this.solver = solver;
    this.inputHandler = new InputHandler(screen);
    this.particleRadius = 5;
    this.currentParticle;
  }

  update() {
    this.solver.particles.forEach(particle => {
      if (this.inputHandler.mouse.down) {
        let length = particle.position.subtract(this.inputHandler.mouse.position).length();
        // if (length < this.particleRadius)
          this.currentParticle = particle;
      } else
        this.currentParticle = null;
      if (this.currentParticle)
        this.currentParticle.position = this.inputHandler.mouse.position.clone();
    });
  }
}
