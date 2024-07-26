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

class Node {
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
  constructor(node0, node1, length, stiffness) {
    this.node0 = node0;
    this.node1 = node1;
    this.length = length;
    this.stiffness = stiffness;
  }

  update() {
    const d = this.node0.position.subtract(this.node1.position);
    const f = d.normal().multiplyScaler(0.5 * this.stiffness * (d.length() - this.length));
    this.node0.applyImpulse(f.multiplyScaler(-1));
    this.node1.applyImpulse(f);
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

    this.nodes = [];
    this.constraints = [];

    this.onUpdate = undefined;
  }

  applyGravity() {
    this.nodes.forEach(node => node.applyForce(this.gravity));
  }

  updatePositions() {
    this.nodes.forEach(node => node.update(this.deltaTime));
  }

  applyBounds() {
    this.nodes.forEach(node => {
      if (node.position.x < this.boundsMargin) {
        node.position.x = this.boundsMargin;
        node.positionLast.x = node.position.x;
        let j = node.velocity.y;
        let k = Math.abs(node.velocity.x * this.borderFriction);
        let t = Math.sign(j);
        if (Math.abs(j) <= k) {
          if (j * t > 0)
            node.position.y -= j;
        } else if (k > 0)
          node.position.y -= k * t;
      }
      if (node.position.x > this.width - this.boundsMargin) {
        node.position.x = this.width - this.boundsMargin;
        node.positionLast.x = node.position.x;
        let j = node.velocity.y;
        let k = Math.abs(node.velocity.x * this.borderFriction);
        let t = Math.sign(j);
        if (Math.abs(j) <= k) {
          if (j * t > 0)
            node.position.y -= j;
        } else if (k > 0)
          node.position.y -= k * t;
      }
      if (node.position.y < this.boundsMargin) {
        node.position.y = this.boundsMargin;
        node.positionLast.y = node.position.y;
        let j = node.velocity.x;
        let k = Math.abs(node.velocity.y * this.borderFriction);
        let t = Math.sign(j);
        if (Math.abs(j) <= k) {
          if (j * t > 0)
            node.position.x -= j;
        } else if (k > 0)
          node.position.x -= k * t;
      }
      if (node.position.y > this.height - this.boundsMargin) {
        node.position.y = this.height - this.boundsMargin;
        node.positionLast.y = node.position.y;
        let j = node.velocity.x;
        let k = Math.abs(node.velocity.y * this.borderFriction);
        let t = Math.sign(j);
        if (Math.abs(j) <= k) {
          if (j * t > 0)
            node.position.x -= j;
        } else if (k > 0)
          node.position.x -= k * t;
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
  constructor(solver, screen) {
    this.solver = solver;
    this.screen = screen;

    this.nodeRadius = 5;
  }

  render() {
    this.screen.ctx.fillStyle = '#293148';
    this.screen.ctx.fillRect(0, 0, this.screen.canvas.width, this.screen.canvas.height);
    this.screen.ctx.fillStyle = '#fff';
    this.screen.ctx.strokeStyle = '#f33';
    this.screen.ctx.lineWidth = 2;
    this.solver.constraints.forEach(constraint => {
      this.screen.ctx.beginPath();
      this.screen.ctx.moveTo(constraint.node0.position.x, constraint.node0.position.y);
      this.screen.ctx.lineTo(constraint.node1.position.x, constraint.node1.position.y);
      this.screen.ctx.stroke();
    });
    this.solver.nodes.forEach(node => {
      this.screen.ctx.beginPath();
      this.screen.ctx.arc(node.position.x, node.position.y, this.nodeRadius, 0, 2 * Math.PI);
      this.screen.ctx.fill();
    });
  }
}

class InputHandler {
  constructor() {
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

    window.addEventListener('touchstart', e => {
      this.mouse.down = true;
    });
    window.addEventListener('touchend', e => {
      this.mouse.down = false;
    });
    window.addEventListener('touchmove', e => {
      this.mouse.position.x = e.touches[0].clientX;
      this.mouse.position.y = e.touches[0].clientY;
    });
  }
}

class InteractionHandler {
  constructor(solver) {
    this.solver = solver;
    this.inputHandler = new InputHandler();
    this.nodeRadius = 5;
    this.currentnode;
  }

  update() {
    this.solver.nodes.forEach(node => {
      if (this.inputHandler.mouse.down) {
        let length = node.position.subtract(this.inputHandler.mouse.position).length();
        if (length < this.nodeRadius)
          if (this.currentnode == node || this.currentnode == null)
            this.currentnode = node;
      } else {
        this.currentnode = null;
      }
      if (this.currentnode)
        this.currentnode.position = this.inputHandler.mouse.position.clone();
    });
  }
}
