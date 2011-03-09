var FIZZ = (function(){
  
    var _self = {};
    
    
    var collisionTypes = {
        'light' : 0,
        'normal': 1,
        'heavy' : 2,
        'static': 3
    };
    
    _self.World = function (config) {
        
        // Use the first canvas element by default
        this.canvas = document.getElementsByTagName('canvas')[0];
        
        // The default framerate (ideally)
        this.fps = 100;
        
        // The default gravity in pixels/second/second
        this.gravity = -100; 
        
        // Keeps track of entities and collisions
        this.entities = [];
        this.collisions = [];
        
        // Keeps track of total steps and time between steps in seconds
        this.steps = {};
        this.steps.count = 0;
        this.steps.delta = 0;
        this.steps.last = 0;
        this.steps.record = function () {
            var t = (new Date()).getTime();
            if (this.count > 0) {
                this.delta = (t - this.last) / 1000; // delta in seconds
            }
            this.last = t;
            this.count++;
        };
        
        this.step = function () {
                
            var world = this;
            this.clear();
            this.draw();
            this.steps.record();
            setTimeout(function () {
                world.step();
            }, 1000/this.fps);

        };
        
        this.clear = function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        };
        
        this.draw = function () {
            for (var i = 0, len = this.entities.length; i < len; i++) {

                    var entity = this.entities[i];
                    entity.move(this);
                    entity.render(this);
                    for (var j = 0; j < i; j++) {
                        entity.checkCollision(this.entities[j], this);
                    }
            }
            
            this.handleCollisions();
        };
        this.handleCollisions = function () {
            for (var i in this.collisions) {
                if (this.collisions.hasOwnProperty(i)) {
                    var entity = this.collisions[i].entity;
                    var plane = this.collisions[i].plane;
                    var adjustment = this.collisions[i].adjustment;
                    entity.position[plane] += adjustment;
                    entity.velocity[plane] = entity.velocity[plane] * -1 * entity.bounciness;
                } 
            }
            this.collisions = [];
        };
        this.getRealY = function (y) {
            return this.canvas.height - y;
        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                this[i] = config[i];
            }
        }
        
        this.context = this.canvas.getContext('2d'); 

    };
    
    _self.Entity = function (config) {
        
        this.color = 'black';
        
        this.position = { x : 0, y : 0};
        this.velocity = { x : 1, y : 0};
        this.acceleration = { x : 0, y : 0};
        
        this.gravity = 1;
        this.bounciness = 0;
        this.collisionType = 'normal';
        
        this.edges = {};
        this.edges.top = 0;
        this.edges.right = 0;
        this.edges.bottom = 0;
        this.edges.left = 0;
        
        this.move = function (world) {

            this.velocity.x += this.acceleration.x * world.steps.delta;

            if (this.edges.bottom <= 0 && this.bounciness <= 0) {
                this.acceleration.y = 0;
                this.velocity.y = 0;
            }
            else {
                var accelY = this.acceleration.y + world.gravity * this.gravity;
                this.velocity.y += accelY * world.steps.delta;
            }

            this.position.x += this.velocity.x * world.steps.delta;
            this.position.y += (this.edges.bottom <= 0 && this.velocity.y <= 0) ? 0 : this.velocity.y * world.steps.delta;

            this.computeEdges();

            if (this.bounciness > 0 && this.edges.bottom <= 0) {
                this.velocity.y = this.velocity.y * -1 * this.bounciness;
            }
        };
        
        this.renderTo = function (world) {
            if (typeof world !== 'undefined') {
                world.entities.push(this);
                this.render(world);
            }
            return this;
        };

        this.checkCollision = function (foreign_entity, world) {    
            
            var edges = foreign_entity.edges;
            var opposingX = (foreign_entity.velocity.x < 0 && this.velocity.x < 0 ||foreign_entity.velocity.x > 0 && this.velocity.x > 0);
            var opposingY = (foreign_entity.velocity.y < 0 && this.velocity.y < 0 ||foreign_entity.velocity.y > 0 && this.velocity.y > 0);
            var distanceX, distanceY, adjustments = {};
            
            
            /*
             * TODO: Figure out this collision stuff a little more.  
             * Seems like some of the checks could be combined or eliminated.
             *
             */
            
            // check x values
            
            // This Entity contained entirely within Foreign Entity's width
            if (this.edges.left >= edges.left && this.edges.right <= edges.right) {
                //alert('x5');
                distanceX = 999999999;
            }
            // Foreign Entity contained entirely within This Entity's with
            else if (this.edges.left <= edges.left && this.edges.right >= edges.right) {
                //alert('x6');
                distanceX = 999999999;
            }
            // This Entity's right edge overlapping Foreign Entity's left edge
            else if (this.edges.right >= edges.left && this.edges.left <= edges.left)  {
                //alert('x1');
                distanceX = this.edges.right - edges.left;
                adjustments.total = distanceX * -1;
            }
            // This Entities left edge overlapping with Foreign Entity's right edge 
            else if (this.edges.left <= edges.right && this.edges.right >= edges.right) {
                //alert('x2');
                distanceX = edges.right - this.edges.left;
                adjustments.total = distanceX;
            }
            // Foreign Entity's left edge overlapping with This Entity's right edge
            else if(edges.left <= this.edges.right && edges.right >= this.edges.right) {
                //alert('x3');
                distanceX = edges.left - this.edges.right;
                adjustments.total = distanceX * -1;
            }
            // Foreign Entity's right edge overlapping with This Entity's left edge
            else if(edges.right >= this.edges.left && edges.left <= this.edges.left) {
                //alert('x4');
                distanceX = edges.right - this.edges.left;
                adjustments.total = distanceX * -1;
            }
            else {
                return;
            }
            

            // check y values
            
            // This Entity contained entirely within Foreigh Entity's height
            if (this.edges.bottom >= edges.bottom && this.edges.top <= edges.top) {
                //alert('y5');
                distanceY = 999999999;
            }
            // Foreign Entity contained entirely within This Entity's height
            else if (this.edges.bottom <= edges.bottom && this.edges.top >= edges.top) {
                //alert('y6');
                distanceY = 999999999;
            }
            // This Entities top edge overlapping with Foreign Entity's bottom edge
            else if (this.edges.top >= edges.bottom && this.edges.bottom <= edges.bottom) {                        
                //alert('y1');
                distanceY = this.edges.top - edges.bottom;
                adjustments.total = distanceY * -1;
            }
            // This Entities bottom edge overlapping with Foreign Entity's top edge
            else if (this.edges.bottom <= edges.top && this.edges.top >= edges.top) {
                //alert('y2');
                distanceY = edges.top - this.edges.bottom;
                adjustments.total = distanceY;
            }
            // Foreign Entities bottom edge overlapping with This Entity's top edge
            else if (edges.bottom <= this.edges.top && edges.top >= this.edges.top) {
                //alert('y3');
                distanceY = this.edges.top - edges.bottom;
                adjustments.total = distanceY;
            }
            // Foreign Entities top edge overlapping with This Entity's bottom edge
            else if (edges.top >= this.edges.bottom && edges.bottom <= this.edges.bottom) {
                //alert('y4');
                distanceY = edges.top - this.edges.bottom;
                adjustments.total = distanceY;
            }
            else {
                return;
            }
            
            // Figure out which entity to adjust
            if (collisionTypes[this.collisionType] > collisionTypes[foreign_entity.collisionType]) {
                adjustments.thisEntity = 0;
                adjustments.foreignEntity = adjustments.total * -1;
            }
            else if (collisionTypes[this.collisionType] < collisionTypes[foreign_entity.collisionType]) {
                adjustments.thisEntity = adjustments.total;
                adjustments.foreignEntity = 0;
            }
            else {
                // collisionTypes are the same
                adjustments.thisEntity = adjustments.total / 2 ;
                adjustments.foreignEntity = adjustments.total / 2 * -1;
            }

            world.collisions.push({
                plane : (distanceX < distanceY) ? 'x' : 'y',
                adjustment : adjustments.thisEntity,
                opposing : (distanceX > distanceY) ? opposingX : opposingY,
                entity : this
            });
            
            world.collisions.push({
                plane : (distanceX < distanceY) ? 'x' : 'y',
                adjustment : adjustments.foreignEntity,
                opposing : (distanceX > distanceY) ? opposingX : opposingY,
                entity : foreign_entity
            });

        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                this[i] = config[i];
            }
        }
    };
    
    /* RECTANGLE */
    
    _self.Rectangle = function (config) {
        
        this.width = 0;
        this.height = 0;
        this.edges = {};
        this.color = 'black';
        this.bounciness = 0;
        this.gravity = 1;
        
        this.position = { x : 0, y: 0 };
        this.velocity = { x : 0, y: 0 };
        this.acceleration = { x : 0, y: 0 };
        
        this.computeEdges = function () {
            this.edges.top = this.position.y;
            this.edges.right = this.position.x + this.width;
            this.edges.bottom = this.position.y - this.height;
            this.edges.left = this.position.x;
        };
        
        this.render = function (world) {
            if (typeof world !== 'undefined') {
                world.context.fillStyle = this.color;
                world.context.fillRect(this.position.x, world.getRealY(this.position.y), this.width, this.height);
            }
        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) {
                this[i] = config[i];
            }
        }
    };
    
    _self.Rectangle.prototype = new _self.Entity();
    _self.Rectangle.prototype.constructor = _self.Rectangle;
    
    /* CIRCLE */
    
    _self.Circle = function (config) {
        
        this.radius = 0;
        this.edges = {};
        this.color = 'black';
        this.bounciness = 0;
        this.gravity = 1;
        
        this.position = { x : 0, y: 0 };
        this.velocity = { x : 0, y: 0 };
        this.acceleration = { x : 0, y: 0 };
        
        this.computeEdges = function () {
            this.edges.top = this.position.y + this.radius;
            this.edges.right = this.position.x + this.radius;
            this.edges.bottom = this.position.y - this.radius;
            this.edges.left = this.position.x - this.radius;
        };
        
        this.render = function (world) {
            if (typeof world !== 'undefined') {
                world.context.beginPath();
                world.context.fillStyle = this.color;
                world.context.arc(this.position.x, world.getRealY(this.position.y), this.radius, 0, Math.PI * 2,  true);
                world.context.closePath();
                world.context.fill();
            }
        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                this[i] = config[i];
            }
        }
    };
    
    _self.Circle.prototype = new _self.Entity();
    _self.Circle.prototype.constructor = _self.Circle;
    
    return _self;
  
})();


