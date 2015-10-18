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

/*GAME SETTINGS ETC*/
var running = false;//Event handlers should check this before they do anything, events shouldn't do anything while the game is paused
var started = false;
var timeStep = 1000/60; //Time per frame = 1000ms / 60fps = 16.667ms
var delta = 0;
var lastFrameTimeMS = 0;
var numUpdateSteps = 0;
var frameID; //This will be set to the frameID of the current animation frame, so that it can be used to cancel the animation frame
var canvasWidth = 600;
var canvasHeight = 400;
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
var lPaddle = new Paddle(15,70,60,150);
var rPaddle = new Paddle(15,70,525,150);
//Balls:
function Ball(width,tether){
	this.w = width;
	this.x = 0;
	this.y = 0;
	this.vLeft = 0;
	this.vUp = 0;
	this.movingSpeed = 0.4;
	this.setVLeft();
	this.tetheredTo = tether;
	if(this.tetheredTo != null){
		if(this.tetheredTo===lPaddle){this.setPos(lPaddle.x+lPaddle.w,lPaddle.y+((lPaddle.h-this.w)/2));
		}else if(this.tetheredTo===rPaddle){
			this.setPos(rPaddle.x-this.w,rPaddle.y+((rPaddle.h-this.w)/2));
		}
	}
}
Ball.prototype.setVLeft = function(){
	var lDirectionFactor = 1;
	if(this.vLeft<0){
		lDirectionFactor = -1; 
	}
	this.vLeft = (Math.sqrt((this.movingSpeed*this.movingSpeed)-(this.vUp*this.vUp)))*lDirectionFactor;
}
Ball.prototype.setPos = function(proposedNewX,proposedNewY){ //Sets new position of ball, making sure it is within the canvas and reversed ball direction if needed
	var proposedCentreX = proposedNewX+(this.w/2);
	var proposedCentreY = proposedNewY+(this.w/2);
	checkBallPaddleContact(this,lPaddle);
	checkBallPaddleContact(this,rPaddle);
	if(proposedNewX<0){
		proposedNewX = 0;//Dont' let the ball leave the left hand side of the canvas
		this.vLeft*=-1;
		pointScoredBy(playerR);
	}else if(proposedNewX>canvas.width-this.w){
		proposedNewX = canvas.width - this.w; //Don't let the ball leave the right hand side of the canvas
		this.vLeft *= -1;
		pointScoredBy(playerL);
	}
	if(proposedNewY<0){
		proposedNewY = 0; //Don't let the ball leave the top of the canvas
		this.vUp *= -1;
	}else if(proposedNewY>canvas.height-this.w){
		proposedNewY = canvas.height-this.w; //Don't let the ball leave the bottom of the canvas
		this.vUp *= -1;
	}
	function checkBallPaddleContact(ball,paddle){
		if(ball.vLeft>0 && thereIsLineCircleContact(paddle.x+paddle.w,paddle.y,paddle.y+paddle.h,proposedCentreX,proposedCentreY,ball.w)){
			// proposedNewX = paddle.x+paddle.w;//If hits right side of paddle while going left, reverse horizontal direction
			ball.vLeft*=-1;
			ball.vUp+=(paddle.vUp/5);
			ball.setVLeft();
		}
		if(ball.vLeft<0 && thereIsLineCircleContact(paddle.x,paddle.y,paddle.y+paddle.h,proposedCentreX,proposedCentreY,ball.w)){
			// proposedNewX = paddle.x-ball.w;//If hits left side of paddle while going right, reverse horizontal direction
			ball.vLeft*=-1;
			ball.vUp+=(paddle.vUp/5);
			ball.setVLeft();
		}
		if(ball.vUp>0 && thereIsLineCircleContact(paddle.y+paddle.h,paddle.x,paddle.x+paddle.w,proposedCentreY,proposedCentreX,ball.w)){
			// proposedNewY = paddle.y+paddle.h;//If hits bottom side of paddle while going up, reverse vertical direction
			ball.vUp*=-1;
		}
		if(ball.vUp<0 && thereIsLineCircleContact(paddle.y,paddle.x,paddle.x+paddle.w,proposedCentreY,proposedCentreX,ball.w)){
			// proposedNewY = paddle.y-ball.w;//If hits top side of paddle while going down, reverse vertical direction
			ball.vUp*=-1;
		}
	}
	function thereIsLineCircleContact(lineDistanceFromAxis,lineStart,lineStop,circleCentreCoordinate1,circleCentreCoordinate2,circleDiameter){
		var contact;
		var a = lineDistanceFromAxis;
		var b = lineStart;
		var c = lineStop;
		var d = circleCentreCoordinate1;//For vertical line: circleCentreCoordinate1 is the x coordinate and circleCentreCoordinate2 is the y coordinate
		var e = circleCentreCoordinate2;//For horizontal line: circleCentreCoordinate1 is the y coordinate and circleCentreCoordinate2 is the x coordinate
		var w = circleDiameter;
		var disc = (8*a*d)-(4*a*a)-(4*d*d)+(w*w); //The discriminant of the quadratic equation
		if(disc<0){ //If there are no roots to the quadratic equation...
			contact = false;
			return contact; //...return false
		}else{
			var root1 = ((2*e)+Math.sqrt(disc))/2;
			var root2 = ((2*e)-Math.sqrt(disc))/2;
			if((b<=root1&&root1<=c)||(b<=root2&&root2<=c)){ //If the roots lie on the line...
				contact = true;
				return contact; //...return true
			}else{
				contact = false; //If the roots are outside of the line...
				return contact; //...return false
			}
		}
	}
	this.x = proposedNewX;
	this.y = proposedNewY;
}
//var balls []; - Could use this if want to have multiball
var ball = new Ball(15,lPaddle);

//Players:
function Player(paddle,scoreCounterId){ //Has to come after paddles are created so that paddles can be assigned to players
	this.score = 0;
	this.pressingUp = false;
	this.pressingDown = false;
	this.paddle = paddle;
	this.scoreCounter = document.getElementById(scoreCounterId);
}
var playerL = new Player(lPaddle,"pLScore");
var playerR = new Player(rPaddle,"pRScore");

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
	ctx.beginPath();
	ctx.arc(ball.x+(ball.w/2),ball.y+(ball.w/2),ball.w/2,0,2*Math.PI,false);
	ctx.fillStyle = "#000000";
	ctx.fill();	
}

function movePaddles(t){
	lPaddle.setY(lPaddle.y-(lPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
	rPaddle.setY(rPaddle.y-(rPaddle.vUp * t));//Propose the paddle's y coordinate depending on its velocity and how much time has passed
}

function moveBalls(t){
	if(ball.tetheredTo != null){
		if(ball.tetheredTo===lPaddle){
			ball.setPos(lPaddle.x+lPaddle.w,lPaddle.y+((lPaddle.h-ball.w)/2));
		}else if(ball.tetheredTo===rPaddle){
			ball.setPos(rPaddle.x-ball.w,rPaddle.y+((rPaddle.h-ball.w)/2));
		}
	}else{
		ball.setPos(ball.x-(ball.vLeft*t),ball.y-(ball.vUp*t));
	}
}

function pointScoredBy(scorer){
	scorer.score+=1;
	scorer.scoreCounter.innerHTML = scorer.score;
	ball = new Ball(15,scorer.paddle);//The old ball object will be garbage collected because there is no way to refer to it, so it won't take up memory
	lPaddle.y = (canvas.height-lPaddle.h)/2;
	rPaddle.y = (canvas.height-rPaddle.h)/2;
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
			if(event.keyCode===68){//If player presses d...
				if(ball.tetheredTo===lPaddle){//...and the ball is tetherd to the left paddle...
					ball.tetheredTo = null;//...untether the ball
				}
			}
			if(event.keyCode===37){//If player presses left...
				if(ball.tetheredTo===rPaddle){//...and the ball is tethered to the right paddle...
					ball.tetheredTo = null;//...untether the ball
				}
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
//Just after changing it so that paddles impart momentum to the ball, the ball dissapeared mid game. Console.log showed that 
//ball.x and ball.vLeft were both NaN. Setting them both through the console to numbers made the ball reappear. Also I think the ball
//hit the paddle just before it disappeared.
//I managed to make the ball go completely vertical directly next to the paddle.

/*TO DO LIST*/
//Make the ball change colour when it changes direction
//Make stars/coins randomly appear up to some maximum number that can be present at any time
//Add hit detection between ball and stars/coins
//Add player star counter on screen and also as a property of Player
//Make crates appear

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
//Paddle can move in two dimensions