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
//Paddles:
function Paddle(width,height,xPos,yPos){
	this.w = width;
	this.h = height;
	this.x = xPos;
	this.y = yPos;
	this.vUp = 0;
	this.defaultSpeed = 0.4;
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
var lPaddle = new Paddle(15,50,60,150);
var rPaddle = new Paddle(15,50,525,150);
//Balls:
function Ball(width,xPos,yPos,vLeft,vUp){
	this.w = width;
	this.x = xPos;
	this.y = yPos;
	this.vLeft = vLeft;
	this.vUp = vUp;
	this.movingSpeed = 0.3;
}
Ball.prototype.setVLeft = function(){
	this.vLeft = Math.sqrt((this.movingSpeed*this.movingSpeed)-(this.vUp*this.vUp));
}
Ball.prototype.setPos = function(proposedNewX,proposedNewY){ //Sets new position of ball, making sure it is within the canvas and reversed ball direction if needed
	if(proposedNewX<0){
		proposedNewX = 0;
		this.vLeft*=-1;
	}else if(proposedNewX>canvas.width-this.w){
		proposedNewX = canvas.width - this.w;
		this.vLeft *= -1;
	}
	if(proposedNewY<0){
		proposedNewY = 0;
		this.vUp *= -1;
	}else if(proposedNewY>canvas.height-this.w){
		proposedNewY = canvas.height-this.w;
		this.vUp *= -1;
	}
	if(proposedNewX>=lPaddle.x && proposedNewX<=lPaddle.x+lPaddle.w && proposedNewY>=lPaddle.y && proposedNewY<=lPaddle.y+lPaddle.h && this.vLeft>0){
		proposedNewX = lPaddle.x+lPaddle.w;
		this.vLeft*=-1;
	}
	if(proposedNewX+this.w>=rPaddle.x && proposedNewX+this.w<=rPaddle.x+rPaddle.w && proposedNewY>=rPaddle.y && proposedNewY<=rPaddle.y+rPaddle.h && this.vLeft<0){
		proposedNewX = rPaddle.x-this.w;
		this.vLeft*=-1;
	}
	this.x = proposedNewX;
	this.y = proposedNewY;
}
//var balls []; - Could us this if want to have multiball
var ball = new Ball(15,75,180,0,0.1);
ball.setVLeft();
//Players:
function Player(paddle){ //Has to come after paddles are created so that paddles can be assigned to players
	this.pressingUp = false;
	this.pressingDown = false;
	this.paddle = paddle;
}
var playerL = new Player(lPaddle);
var playerR = new Player(rPaddle);

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
	moveBalls(t);
}

function draw(firstDraw){
	if(firstDraw===1){
	}
	ctx.clearRect(0,0,canvas.width,canvas.height); //Clear the canvas
	ctx.fillStyle = "#ff0000"; //Set fill colour to red and...
	ctx.fillRect(lPaddle.x,lPaddle.y,lPaddle.w,lPaddle.h); //...draw the left paddle
	ctx.fillStyle = "#0000ff"; //Set fill colour to blue and...
	ctx.fillRect(rPaddle.x,rPaddle.y,rPaddle.w,rPaddle.h); //...draw the right paddle
	ctx.strokeStyle = "#ff0000"; //Set fill colour to red and...
	ctx.beginPath();
	ctx.arc(ball.x+(ball.w/2),ball.y+(ball.w/2),ball.w/2,0,2*Math.PI,false);
	ctx.fillStyle = "#ff0000";
	ctx.fill();	
}

function movePaddles(t){
	lPaddle.setY(lPaddle.y-(lPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
	rPaddle.setY(rPaddle.y-(rPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
}

function moveBalls(t){
	ball.setPos(ball.x-(ball.vLeft*t),ball.y-(ball.vUp*t));
}

function respondToKey(event){
	if(running){ //If the game is running...
		if(event.type==="keydown"){
			if(event.keyCode===87){
				playerL.pressingUp=true;
			}
			if(event.keyCode===83){
				playerL.pressingDown=true;
			}
			if(event.keyCode===38){
				playerR.pressingUp=true;
			}
			if(event.keyCode===40){
				playerR.pressingDown=true;
			}
		}else if(event.type==="keyup"){
			if(event.keyCode===87){
				playerL.pressingUp=false;
			}
			if(event.keyCode===83){
				playerL.pressingDown=false;
			}
			if(event.keyCode===38){
				playerR.pressingUp=false;
			}
			if(event.keyCode===40){
				playerR.pressingDown=false;
			}
		}
		function movePaddle(player){
			if(player.pressingUp){
				if(player.pressingDown){ //If they are pressing up and down
					player.paddle.vUp = 0;
				}else{ //If they are only pressing up
					player.paddle.vUp = player.paddle.defaultSpeed;
				}
			}else if(player.pressingDown){ //If they are only pressing down
				player.paddle.vUp = -1 * player.paddle.defaultSpeed;
			}else{ //If they are not pressing up or down
				player.paddle.vUp = 0;
			}
		}
		movePaddle(playerL);
		movePaddle(playerR);
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

/*TO DO LIST*/
//Add hit detection to top and bottom of paddles
//Make the ball change colour when it changes direction
//Make it so that the ball can be tethered to paddles (so it moves with them until it is fired)
//Make it so the ball starts of tethered and can then be fired by pressing d or <-
//Make it so that if the ball hits a side wall the ball is deleted and a new ball is created tethered to a paddle
//Add score counters
//Celebrate making a standard implementation of pong!

/*WEAPON/ITEM IDEAS*/
//Speed up own paddle
//Slow down oponent's paddle
//Barrier (that breaks when hit)
//One way barrier (could be suped up version of barrier)
//Missile
//Telekinesis (control ball while it moves through the air)
//Reverse ball direction
//Reinforced/larger ball that can break through barriers
//Larger paddle/ Two paddles (maybe one slightly forward and they mirror each other's movement)
//Multiball
//Full/partial barrier behind paddle