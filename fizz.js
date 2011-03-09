var FIZZ = (function(){
  
    var _self = {};
    
    _self.World = function (config) {
        
        var _world = {
            canvas : document.getElementsByTagName('canvas')[0], // default to first canvas element
            context : null,
            width : 0,
            height : 0,
            fps : 60,
            gravity : -50,
            stats : {
                steps : {
                    count : 0,
                    delta: 0,
                    last : 0,
                    record : function () {
                        var t = (new Date()).getTime();
                        if (this.count > 0) {
                            this.delta = (t - this.last) / 1000; // delta in seconds
                        }
                        this.last = t;
                        this.count++;
                    }
                }
            },
            entities : [],
            entityMap : [],
            entityCollisions : [],
            init : function (config) {
                for (var i in config) {
                    if (config.hasOwnProperty(i)) { 
                        this[i] = config[i];
                    }
                }
                this.context = this.canvas.getContext('2d');
                this.width = this.canvas.width;
                this.height = this.canvas.height;
            },
            step : function () {
                
                var world = this;
                this.clear();
                this.draw();
                this.stats.steps.record();
                setTimeout(function () {
                    world.step();
                }, 1000/this.fps);
                
            },
            clear : function () {
                this.context.clearRect(0, 0, this.width, this.height);
            },
            draw : function () {
                for (var i = 0, len = this.entities.length; i < len; i++) {
                        
                        var entity = this.entities[i];
                        entity.move(this);
                        entity.render(this);
                        for (var j = 0; j < i; j++) {
                            entity.checkCollision(this.entities[j], this);
                        }
                }
                for (var i in this.entityCollisions) {
                    if (this.entityCollisions.hasOwnProperty(i)) {
                        var entity = this.entityCollisions[i].entity;
                        var plane = this.entityCollisions[i].collisionPlane;
                        entity.velocity[plane] = entity.velocity[plane] * -1 * entity.bounciness;
                    } 
                }
                this.entityCollisions = [];
            },
            getRealY : function (y) {
                   return this.height - y;
            }
        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                _world[i] = config[i];
            }
        }
        _world.context = _world.canvas.getContext('2d');
        _world.width = _world.canvas.width;
        _world.height = _world.canvas.height; 
    
        return _world;
    };
    
    _self.Entity = function (config) {
        
        var _entity = {
            color : 'black',
            bounciness : 0,
            gravity : 1,
            position : { x : 0, y : 0},
            velocity : { x : 1, y : 0},
            acceleration : { x : 0, y : 0},
            edges : {
                top : 0,
                right : 0,
                bottom : 0,
                left : 0
            },
            move : function (world) {
                
                this.velocity.x += this.acceleration.x * world.stats.steps.delta;
                
                if (this.edges.bottom <= 0 && this.bounciness <= 0) {
                    this.acceleration.y = 0;
                    this.velocity.y = 0;
                }
                else {
                    var accelY = this.acceleration.y + world.gravity * this.gravity;
                    this.velocity.y += accelY * world.stats.steps.delta;
                }
                
                this.position.x += this.velocity.x * world.stats.steps.delta;
                this.position.y += (this.edges.bottom <= 0 && this.velocity.y <= 0) ? 0 : this.velocity.y * world.stats.steps.delta;
                
                this.computeEdges();
                
                if (this.bounciness > 0 && this.edges.bottom <= 0) {
                    this.velocity.y = this.velocity.y * -1 * this.bounciness;
                }
            },
            renderTo : function (world) {
                if (typeof world !== 'undefined') {
                    world.entities.push(this);
                    this.render(world);
                }
                return this;
            },
            
            checkCollision : function (foreign_entity, world) {    
                
                var edges = foreign_entity.edges;
                var opposingX = (foreign_entity.velocity.x < 0 && this.velocity.x < 0 ||foreign_entity.velocity.x > 0 && this.velocity.x > 0);
                var opposingY = (foreign_entity.velocity.y < 0 && this.velocity.y < 0 ||foreign_entity.velocity.y > 0 && this.velocity.y > 0);
                var distanceX, distanceY;
                
                // check x values
                if (edges.left >= this.edges.left && edges.left <= this.edges.right)  {
                    distanceX = this.edges.right - edges.left;
                }
                else if (edges.right >= this.edges.left && edges.right <= this.edges.right) {
                    distanceX = edges.right - this.edges.left;
                }
                else {
                    return;
                }
                
                // check y values
                if (edges.bottom >= this.edges.bottom && edges.bottom <= this.edges.top) {                        
                    distanceY = this.edges.top - edges.bottom;        
                }
                else if (edges.top >= this.edges.bottom && this.top <= this.edges.top) {
                    distanceY = edges.top - this.edges.bottom;
                }
                else {
                    return;
                }
                
                world.entityCollisions.push({
                    collisionPlane : (distanceX < distanceY) ? 'x' : 'y',
                    opposing : (distanceX > distanceY) ? opposingX : opposingY,
                    entity : foreign_entity
                });
                
                world.entityCollisions.push({
                    collisionPlane : (distanceX < distanceY) ? 'x' : 'y',
                    opposing : (distanceX > distanceY) ? opposingX : opposingY,
                    entity : this
                });
                
            }
        };
        
        for (var i in config) {
            if (config.hasOwnProperty(i)) { 
                _entity[i] = config[i];
            }
        }
        
        return _entity;
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


