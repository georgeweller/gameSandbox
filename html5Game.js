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
	this.vMax = 0.5;
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
Paddle.prototype.increaseVUp = function(amount){//Change the paddle's velocity by amount. The exception is if the paddle isunable to move then it's velocity and acceleration should be set to zero. Also vUp cannot be greater in magnitude than Vmax
	proposedNewVUp = lPaddle.vUp + amount; //Propose new vUp equal to current vUp plus amount
	if(proposedNewVUp>lPaddle.vMax){ //If this is bigger than the maximum positive velocity...
		proposedNewVUp = lPaddle.vMax; //...set the proposed vUp to the maxixum positive velocity
	}else if(proposedNewVUp<(lPaddle.vMax*-1)){ //If this is bigger than the maximum negative velocity...
		proposedNewVUp = (lPaddle.vMax*-1); //...set the proposed vUp to the maximum negative velocity
	}
	if((proposedNewVUp>0 && lPaddle.y===0)||(proposedNewVUp<0 && lPaddle.y>(canvas.height-lPaddle.h))){//If the paddle is at the edge of the canvas in the direction it is moving...
		proposedNewVUp = 0; //Set the proposed velocity to zero
		lPaddle.aUp = 0; //And set the actual acceleration to zero
	}	
	lPaddle.vUp = proposedNewVUp; //Set the actual velocity to the proposed velocity
}
// 	/*Methods that would be useful: incVUp(amt), incAUp(amt), setY(proposedNewY)*/
var lPaddle = new Paddle(15,50,60,180);

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
	moveLPaddle(t);	
}

function draw(firstDraw){
	if(firstDraw===1){
	}
	ctx.clearRect(0,0,canvas.width,canvas.height); //Clear the canvas
	ctx.fillStyle = "#ff0000"; //Set fill colour to red and...
	ctx.fillRect(lPaddle.x,lPaddle.y,lPaddle.w,lPaddle.h); //...draw the left paddle
}

function moveLPaddle(t){
	lPaddle.setY(lPaddle.y-(lPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
	lPaddle.increaseVUp(lPaddle.aUp*t);//Increase velocity by (acceleration * time since last frame)
}

function respondToKey(event){
	if(running){ //If the game is running...
		if(event.type==="keydown"){
			if(event.keyCode===87){
				lPaddle.aUp+=0.01;//When w is held down, increase aUp...
				if(lPaddle.aUp>lPaddle.aMax){ //...but don't let it go above max
					lPaddle.aUp=lPaddle.aMax;
				}
			}else if(event.keyCode===83){
				lPaddle.aUp-=0.01;//When s is held down, decreae aUp...
				if(lPaddle.aUp<(lPaddle.aMax)*-1){
					lPaddle.aUp = (lPaddle.aMax*-1);//...but don't let it go below max*-1
				}//Maybe I should abstract all of this checking out into a .increaseAccel() method on the lPaddle object
			}
		}else if(event.type==="keyup"){
			if(event.keyCode ===87 || event.keyCode ===83){
				lPaddle.aUp = 0;//When w or s is released, set lPaddle.aUp to zero
				lPaddle.vUp = 0;//And set lPaddle.vUp to zero
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