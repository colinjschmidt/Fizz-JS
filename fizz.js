/**
 * Fizz JS - A Simple Javascript Physics Engine
 * 
 * @author Colin Schmidt
 * @version 1.0 3/15/2011
 */
var FIZZ = (function(){
  
    var _self = {};
    
    _self.World = function (config) {
        
        // Use the first canvas element by default
        this.canvas = document.getElementsByTagName('canvas')[0];
        
        // Setup canvas element to use as a buffer
        this.buffer = document.createElement('canvas');
        this.bufferContext = this.buffer.getContext('2d');
        
        // The default framerate (ideally)
        this.fps = 100;
        
        // The default gravity in pixels/second/second
        this.gravity = -100; 
        
        // Keeps track of entities
        this.entities = [];
        
        // Keeps track of total steps and time between steps in seconds
        this.steps = {
            count : 0,
            delta : 0,
            last : 0,
            record : function () {
                var t = (new Date()).getTime();
                if (this.count > 0) {
                    this.delta = (t - this.last) / 1000; // delta in seconds
                }
                this.last = t;
                this.count++;
            }
        };
        
        /**
         * Main Game Loop, called once per frame
         * 
         * Current Loop:
         *     1. Clear buffer and canvas
         *     2. Move and check collisions
         *     3. Render each entity to buffer
         *     4. Draw buffer to canvas
         */
        this.step = function () {
                
            this.clear();
            this.draw();
            this.steps.record();
            
            // Use setTimeout, rather than set interval so that steps won't overlap on slow connections
            // Best case scenario, step is called at "framerate" times per second.  
            // All entity movements are based off of pixels per second and not pixels per frame,
            // So that entities should move at same speed independent of connection speed
            var world = this;
            setTimeout(function () {
                world.step();
            }, 1000/this.fps);

        };
        
        /**
         * Cleans the buffer and canvas, used between frames
         */
        this.clear = function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.bufferContext.clearRect(0, 0, this.buffer.width, this.buffer.height);
        };
        
        /**
         * Draws each entity into the world
         */
        this.draw = function () {
            
            // Move all of the entities
            for (var i = 0, len = this.entities.length; i < len; i++) {
                
                var entity = this.entities[i];
                
                // Update the position of the Entity
                if (typeof entity.move !== 'undefined') {
                    entity.move(this);
                }
                
                // Check for collisions on all previously moved items
                for (var j = 0; j < i; j++) { 
                    var foreign_entity = this.entities[j];
                    entity.checkCollision(foreign_entity, this);
                }
                
                entity.render(this);
            }
            
            // Redraw canvas from buffer
            this.context.drawImage(this.buffer, 0, 0);
        };
        
        /**
         * Adds an entity to the world and reorders entities by zIndex property
         * higher zIndexes are rendered after (aka on top of) lower zIndexes.
         */
        this.addEntity = function (entity) {
            this.entities.push(entity);
            this.entities.sort(function(a, b){return a.zIndex - b.zIndex;});
        };
        
        /**
         * Gets the actual Y coordinate on the canvas
         * 
         * This function allows us to pretend like the canvas's origin is in the bottom left,
         * rather than the top left.  This is to make things a bit simpler ... 
         * positive velocities move up, rather than down for example.
         */
        this.getRealY = function (y) {
            return this.canvas.height - y;
        };
        
        // Add all methods and properties in config to this object
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                this[i] = config[i];
            }
        }
        
        // Add a shortcut to the canvas's context object
        this.context = this.canvas.getContext('2d');
        
        // Setup the buffer attributes
        this.buffer.height = this.canvas.height;
        this.buffer.width = this.canvas.width;
    };
    
    _self.Entity = function (config) {
        
        var collisionTypes = {
            'light' : 0,
            'normal': 1,
            'heavy' : 2,
            'static': 3
        };
        
        this.color = 'black';
        
        this.position = {x : 0, y : 0};
        this.velocity = {x : 0, y : 0};
        this.acceleration = {x : 0, y : 0};
        this.edges = {};
        
        this.gravity = 1;
        this.bounciness = 0;
        this.collisionType = 'normal';
        
        this.zIndex = 1;
        
        this.move = function (world) {

            this.velocity.x += this.acceleration.x * world.steps.delta;

            if (this.edges.bottom <= 0 && this.bounciness <= 0 && world.steps.count < 1) {
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
                world.addEntity(this);
                
                var positionMap = {
                
                    x : {
                        'center' : (world.canvas.width / 2) - (0.5 * this.width),
                        'right' : (world.canvas.width) - this.width,
                        'left' : 0
                    },

                    y : {
                        'center' : (world.canvas.height / 2) - (0.5 * this.height),
                        'top' : world.canvas.height,
                        'bottom' : this.height
                    }
                };
                
                if (typeof this.position.x == 'string') {
                    this.position.x = (positionMap.x[this.position.x]) ? positionMap.x[this.position.x] : 0;
                }
                
                if (typeof this.position.y == 'string') {
                    this.position.y = (positionMap.y[this.position.y]) ? positionMap.y[this.position.y] : this.height;
                }
                
                this.render(world);
            }
            return this;
        };

        this.checkCollision = function (foreign_entity, world) {    
            
            var edges = foreign_entity.edges;
            var opposingX = (foreign_entity.velocity.x < 0 && this.velocity.x < 0 ||foreign_entity.velocity.x > 0 && this.velocity.x > 0);
            var opposingY = (foreign_entity.velocity.y < 0 && this.velocity.y < 0 ||foreign_entity.velocity.y > 0 && this.velocity.y > 0);
            var plane, distanceX, distanceY, adjustments = {};
            
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
            
            // Figure out which side collided first
            plane = (distanceX < distanceY) ? 'x' : 'y';
            this.onCollide(plane, adjustments.thisEntity);
            foreign_entity.onCollide(plane, adjustments.foreignEntity);

        };
        
        /**
         * Resolves any entity overlap (occurs when enities collide between frames)
         * and reverses (and multiplies) the entities velocity depending on its bounciness
         */
        this.onCollide = function (plane, adjustment) {
            
            // Move the overlapping entity
            this.position[plane] += adjustment;
                    
            // Reverse the direction of the colliding entity and increase its velocity by its bounciness
            this.velocity[plane] = this.velocity[plane] * -1 * this.bounciness;
        }
        
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
        
        this.position = {x : 0, y: 0};
        this.velocity = {x : 0, y: 0};
        this.acceleration = {x : 0, y: 0};
        
        this.computeEdges = function () {
            this.edges.top = this.position.y;
            this.edges.right = this.position.x + this.width;
            this.edges.bottom = this.position.y - this.height;
            this.edges.left = this.position.x;
        };
        
        this.render = function (world) {
            if (typeof world !== 'undefined') {
                world.bufferContext.fillStyle = this.color;
                world.bufferContext.fillRect(this.position.x, world.getRealY(this.position.y), this.width, this.height);
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
        
        this.position = {x : 0, y: 0};
        this.velocity = {x : 0, y: 0};
        this.acceleration = {x : 0, y: 0};
        
        this.computeEdges = function () {
            this.edges.top = this.position.y + this.radius;
            this.edges.right = this.position.x + this.radius;
            this.edges.bottom = this.position.y - this.radius;
            this.edges.left = this.position.x - this.radius;
        };
        
        this.render = function (world) {
            if (typeof world !== 'undefined') {
                world.bufferContext.beginPath();
                world.bufferContext.fillStyle = this.color;
                world.bufferContext.arc(this.position.x, world.getRealY(this.position.y), this.radius, 0, Math.PI * 2,  true);
                world.bufferContext.closePath();
                world.bufferContext.fill();
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


