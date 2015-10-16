//This is the event utility object. It is used to add event handlers to elements.
var EventUtil = {
	addHandler: function(element, type, handler){
		if(element.addEventListener){
			element.addEventListener(type, handler, false);
		}else if(element.attachEvent){
			element.attachEvent("on"+type, handler);
		}else{
			element["on"+type] = handler;
		}
	},
	removeHandler: function(element, type, handler){
		if(element.removeEventListener){
			element.removeEventListener(type, handler, false);
		}else if (element.detachEvent){
			element.detachEvent("on"+type, handler);
		}else{
			element["on"+type] = null;
		}
	}
};

//Load an image onto the canvas
// var avatar = new Image();
// avatar.src = "Images/avatar.png";
// avatar.onload = function(){setup();};

/*GAME VARIABLES*/
////Variables for the game in general:
var running = false;//Event handlers should check this before they do anything, events shouldn't do anything while the game is paused
var started = false;
var timeStep = 1000/60; //Time per frame = 1000ms / 60fps = 16.667ms
var delta = 0;
var lastFrameTimeMS = 0;
var numUpdateSteps = 0;
var frameID; //This will be set to the frameID of the current animation frame, so that it can be used to cancel the animation frame
////Variables for specific components of the game:
var canvasWidth = 600;
var canvasHeight = 400;
function Paddle(width,height,xPos,yPos){
	this.w = width;
	this.h = height;
	this.x = xPos;
	this.y = yPos;
	this.vUp = 0;
	this.vMax = 1;
	this.aUp = 0;
	this.aMax = 0.1;
} 
Paddle.prototype.setY = function(proposedNewY){
	if(proposedNewY<0){
		this.y = 0; //Don't let the paddle go out of the top of the canvas...
	}else if(proposedNewY>(canvas.height-this.h)){
		this.y = canvas.height-this.h; //...or the bottom.
	}else{
		this.y = proposedNewY;
	}
};
Paddle.prototype.stopPaddle = function(){
	this.vUp = 0;
	this.aUp = 0;
}
Paddle.prototype.increaseVUp = function(amount){//Change the paddle's velocity by amount. The exception is if the paddle isunable to move then it's velocity and acceleration should be set to zero. Also vUp cannot be greater in magnitude than Vmax
	proposedNewVUp = this.vUp + amount; //Propose new vUp equal to current vUp plus amount
	if(proposedNewVUp>this.vMax){ //If this is bigger than the maximum positive velocity...
		proposedNewVUp = this.vMax; //...set the proposed vUp to the maxixum positive velocity
	}else if(proposedNewVUp<(this.vMax*-1)){ //If this is bigger than the maximum negative velocity...
		proposedNewVUp = (this.vMax*-1); //...set the proposed vUp to the maximum negative velocity
	}
	if((proposedNewVUp>0 && this.y===0)||(proposedNewVUp<0 && this.y>(canvas.height-this.h))){//If the paddle is at the edge of the canvas in the direction it is moving...
		this.stopPaddle(); //Set the paddle velocity and acceleration to zero
	}else{
		this.vUp = proposedNewVUp; //Set the paddle velocity to the proposed velocity
	}	
}
Paddle.prototype.increaseAUp = function(amount){
	if(this.aUp/amount<0){//If the new acceleration is in a differnt direction to the current acceleration...
		this.stopPaddle();//...stop the paddle before carrying on.
	}
	var proposedNewAUp = this.aUp + amount;
	if(proposedNewAUp>this.aMax){
		proposedNewAUp = this.aMax;
	}else if(proposedNewAUp<(this.aMax*-1)){
		proposedNewAUp = (this.aMax*-1);
	}
	this.aUp = proposedNewAUp;
}
var lPaddle = new Paddle(15,50,60,180);
var rPaddle = new Paddle(15,50,525,180);

/*SETTING UP THE CANVAS*/
var canvas = document.getElementById('gameCanvas');//Get a reference to the canvas
if(canvas.getContext){
	var ctx = canvas.getContext('2d');//Generate a context and get a reference to the context
}
setupCanvas();
function setupCanvas(){
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
}

/*GAME FUNCTIONS*/
start();//Start the game as soon as the page loads
function start(){ //Used to begin the animation for the first time or to restart after pausing
	if(!started){ //Don't request multiple frames
		started = true; //Set started to true
		//Dummy frame to get timestamps and initial drawing right
		frameID = requestAnimationFrame(function(timeStamp){ //Track the frameId so we can cancel it if we stop quickly
			draw(1);//Initial drawing
			running = true; //Set running to true. Event handlers should check this.
			lastFrameTimeMS = timeStamp; //Reset time tracking
			frameID = requestAnimationFrame(gameLoop);//requestAnimationFrame passes the current time to gameloop and returns a frameID
		});
	}
}

function stop(){
	cancelAnimationFrame(frameID);
	running = false;
	started = false;
}

function gameLoop(timeStamp){
	delta += timeStamp - lastFrameTimeMS; //Increase the value of delta by the amount of time that has passed since the last frame
	lastFrameTimeMS = timeStamp; //Update lastFrameTimeMS to the time of the current frame
	while(delta>=timeStep){ //If the amount of time that has passed is greater than the length of one frame (16.667ms)...
		update(timeStep); //Do one frame's worth (16.667ms' worth) of updates
		delta-=timeStep; //Reduce delta by the length of one frame (16.667ms)
		// Sanity check - prevents a spiral of death (e.g. if browser has been tabbed away for a long time)
		numUpdateSteps+=1;
		if(numUpdateSteps>=240){
			//panic() - a panic function - maybe stop the game and display an error message
			break;//exit the while loop
		}
	}//If the amount one time that has passed is greater than the length of one frame, then no updates will be made for now, but delta will keep its value
	draw();
	if(canvasWidth>=1000){
		stop();
	}
	frameID = requestAnimationFrame(gameLoop);//requestAnimationFrame calls stretchCanvas and passes the current time as an argument
}

function update(t){
	movePaddles(t);	
}

function draw(firstDraw){
	if(firstDraw===1){
	}
	ctx.clearRect(0,0,canvas.width,canvas.height); //Clear the canvas
	ctx.fillStyle = "#ff0000"; //Set fill colour to red and...
	ctx.fillRect(lPaddle.x,lPaddle.y,lPaddle.w,lPaddle.h); //...draw the left paddle
	ctx.fillStyle = "#0000ff"; //Set fill colour to blue and...
	ctx.fillRect(rPaddle.x,rPaddle.y,rPaddle.w,rPaddle.h); //...draw the right paddle
}

function movePaddles(t){
	lPaddle.setY(lPaddle.y-(lPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
	lPaddle.increaseVUp(lPaddle.aUp*t);//Increase velocity by (acceleration * time since last frame)
	rPaddle.setY(rPaddle.y-(rPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
	rPaddle.increaseVUp(rPaddle.aUp*t);//Increase velocity by (acceleration * time since last frame)
}

function respondToKey(event){
	if(running){ //If the game is running...
		if(event.type==="keydown"){
			if(event.keyCode===87){
				lPaddle.increaseAUp(0.01);//When w is held down, increase lPaddle.aUp.
			}else if(event.keyCode===83){
				lPaddle.increaseAUp(-0.01)//When s is held down, decreae lPaddle.aUp.
			}
			if(event.keyCode===38){
				rPaddle.increaseAUp(0.01);//When up is held down, increase rPaddle.aUp.
			}else if(event.keyCode===40){
				rPaddle.increaseAUp(-0.01)//When down is held down, decreae rPaddle.aUp.
			}
		}else if(event.type==="keyup"){
			if((event.keyCode===87 && lPaddle.vUp>0) || (event.keyCode===83 && lPaddle.vUp<0)){
				lPaddle.stopPaddle();//When w or s is released stop the left paddle
			}
			if((event.keyCode===38 && rPaddle.vUp>0) || (event.keyCode===40 && rPaddle.vUp<0)){
				rPaddle.stopPaddle();//When up or down is released, stop the right paddle
			}
		}
	}	
}

/*EVENT LISTENERS*/
var pauseButton = document.getElementById("pauseButton");
EventUtil.addHandler(pauseButton,"click",stop);
var startButton = document.getElementById("startButton");
EventUtil.addHandler(startButton,"click",start);
//Respond to keydown and keyup events on the window:
EventUtil.addHandler(window,"keydown",respondToKey);
EventUtil.addHandler(window,"keyup",respondToKey);

/*TEST FUNCTIONS*/
function test(){
	alert("Test function called");
}

function test2(){
	alert("Second test function called");
}

/*BUG RECORD*/
/*If you change direction, but you start pressing the new direction before you have released the old one, there is a 
time delay before the paddle starts to move*/

/**WEAPON/ITEM IDEAS/
//Speed up own paddle
//Slow down oponent's paddle
//Barrier (that breaks when hit)
//One way barrier (could be suped up version of barrier)
//Missile
//Telekinesis (control ball while it moves through the air)
//Reverse ball direction
//Reinforced/larger ball that can break through barriers
//Larger paddle/ Two paddles (maybe one slightly forward and they mirror each other's movement)