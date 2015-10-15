var canvas = document.getElementById('gameCanvas');
if(canvas.getContext){
	var ctx = canvas.getContext('2d');
}
var avatar = new Image();
avatar.src = "Images/avatar.png";
avatar.onload = function(){setup();};

var running = false;//Event handlers should check this before they do anything, events shouldn't do anything while the game is paused
var started = false;
var timeStep = 1000/60; //Time per frame = 1000ms / 60fps = 16.667ms
var canvasWidth = 600;
var canvasVelocity = 0.1;
var delta = 0;
var lastFrameTimeMS = 0;
var numUpdateSteps = 0;

function setup(){
	canvas.width = canvasWidth;
	canvas.height = 400;
	ctx.drawImage(avatar,10,10);
}

var frameID;

start();

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
	canvasWidth += canvasVelocity * t;
	if(canvasWidth>1000){
		canvasWidth=1000;
	}
}

function draw(){
	canvas.width=canvasWidth;
}

function stop(){
	cancelAnimationFrame(frameID);
	running = false;
	started = false;
}