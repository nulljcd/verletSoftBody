class Geometry {
  static Vector = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    clone() {
      return new Geometry.Vector(this.x, this.y);
    }

    add(other) {
      return new Geometry.Vector(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
      return new Geometry.Vector(this.x - other.x, this.y - other.y);
    }

    multiply(other) {
      return new Geometry.Vector(this.x * other.x, this.y * other.y);
    }

    multiplyScaler(other) {
      return new Geometry.Vector(this.x * other, this.y * other);
    }

    length2() {
      return Geometry.Vector.dot(this, this);
    }

    length() {
      return Math.sqrt(this.length2());
    }

    normal() {
      const invLength = 1 / this.length();
      return new Geometry.Vector(this.x * invLength, this.y * invLength);
    }

    static dot(a, b) {
      return a.x * b.x + a.y * b.y;
    }

    static min(a, b) {
      return new Geometry.Vector(Math.min(a.x, b.x), Math.min(a.y, b.y));
    }

    static max(a, b) {
      return new Geometry.Vector(Math.max(a.x, b.x), Math.max(a.y, b.y));
    }

    static clamp(a, min, max) {
      return Geometry.Vector.max(Geometry.Vector.min(a, max), min);
    }

    static zero() {
      return new Geometry.Vector(0, 0);
    }
  }

  static Rectangle = class {
    constructor(position, scale) {
      this.position = position;
      this.scale = scale;
    }
  }
}

class Physics {
  static Node = class {
    constructor(position) {
      this.position = position;
      this.positionLast = this.position.clone();
      this.acceleration = Geometry.Vector.zero();
      this.velocity = Geometry.Vector.zero();
      this.isStatic = false;
    }

    applyImpulse(impulse) {
      if (!this.isStatic)
        this.position = this.position.add(impulse);
    }

    applyForce(force) {
      if (!this.isStatic)
        this.acceleration = this.acceleration.add(force);
    }

    updatePosition(deltaTime) {
      this.velocity = this.position.subtract(this.positionLast);
      this.positionLast = this.position.clone();
      this.position = this.position.add(this.velocity).add(this.acceleration.multiplyScaler(deltaTime * deltaTime));
      this.acceleration = Geometry.Vector.zero();
    }
  }

  static Spring = class {
    constructor(nodes, stiffness, restLength = null) {
      this.nodes = nodes;
      if (restLength)
        this.restLength = restLength;
      else
        this.restLength = nodes[0].position.subtract(nodes[1].position).length();
      this.stiffness = stiffness;
    }

    relax() {
      let delta = this.nodes[0].position.subtract(this.nodes[1].position);

      if (delta.x != 0 || delta.y != 0) {
        let movement = delta.normal().multiplyScaler(this.stiffness * (delta.length() - this.restLength));
        if (this.nodes[0].isStatic) {
          this.nodes[1].applyImpulse(movement);
        } else if (this.nodes[1].isStatic) {
          this.nodes[0].applyImpulse(movement.multiplyScaler(-0.2));
        } else {
          this.nodes[0].applyImpulse(movement.multiplyScaler(-0.5));
          this.nodes[1].applyImpulse(movement.multiplyScaler(0.5));
        }
      }
    }
  }

  static Behavior = class {
    static GravityBehavior = class {
      constructor(force) {
        this.force = force;
      }

      apply(node) {
        node.applyForce(this.force);
      }
    }
  }

  static Constraint = class {
    static RectangleConstraint = class {
      constructor(rectangle) {
        this.rectangle = rectangle;
      }

      apply(node) {
        node.applyImpulse(Geometry.Vector.clamp(node.position, this.rectangle.position, this.rectangle.position.add(this.rectangle.scale)).subtract(node.position));
      }
    }
  }

  static World = class {
    constructor() {
      this.deltaTime = 1 / 60;
      this.nodes = [];
      this.springs = [];
      this.behaviors = [];
      this.constraints = [];
    }

    step() {
      this.behaviors.forEach(behavior => this.nodes.forEach(node => behavior.apply(node)));
      this.nodes.forEach(node => node.updatePosition(this.deltaTime));
      this.constraints.forEach(constraint => this.nodes.forEach(node => constraint.apply(node)));
      this.springs.forEach(spring => spring.relax());
    }
  }
}

class Renderer {
  constructor(canvas, physicsWorld) {
    this.canvas = canvas;
    this.physicsWorld = physicsWorld;
    
    this.ctx = canvas.getContext('2d');
  }

  render() {
    this.ctx.fillStyle = '#262a3a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.physicsWorld.springs.forEach(spring => {
      let a = spring.nodes[0].position;
      let b = spring.nodes[1].position;

      this.ctx.strokeStyle = '#484d6d';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    });

    this.ctx.fillStyle = '#935baf';
    this.physicsWorld.nodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.arc(node.position.x, node.position.y, 8, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }
}

class InteractionHandler {
  constructor(physicsWorld) {
    this.physicsWorld = physicsWorld;

    this.mouse = {
      position: Geometry.Vector.zero(),
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

  update() {
    this.physicsWorld.nodes.forEach(node => {
      if (this.mouse.down) {
        let length = node.position.subtract(this.mouse.position).length();
        if (length < 30)
          if (this.currentnode == node || this.currentnode == null)
            this.currentnode = node;
      } else
        this.currentnode = null;
      if (this.currentnode)
        this.currentnode.applyImpulse(this.mouse.position.subtract(this.currentnode.position));
    });
  }
}