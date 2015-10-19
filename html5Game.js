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
var canvasWidth = 700;
var canvasHeight = 400;
var paddles = [];
var defaultPaddleWidth = 15;
var defaultPaddleHeight = 80;
var ballStartingSpeed = 0.3;
var eBallWalls = 0.8; //Coefficient of resistution between ball and walls
var fruitWidth = 20;
var avFruitSpawnTime = 10000;
var crateWidth = 20;
var avCrateSpawnTime = 5000;
var fruit = [];//An array to keep track of all the fruit on the screen
var crates = [];//An array to keep track of all the crates on the screen
var missileWidth = 50;
var missileHeight = 10;
var missileSpeed = 0.5;
var missiles = [];
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
	this.movingSpeed = 0.4;
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
var lPaddle = new Paddle(defaultPaddleWidth,defaultPaddleHeight,60,150);
var rPaddle = new Paddle(defaultPaddleWidth,defaultPaddleHeight,canvas.width-defaultPaddleWidth-60,150);
paddles.push(lPaddle,rPaddle);
//Players:
function Player(paddle,scoreCounterId,fruitCounterId,inventoryDisplayId){ //Has to come after paddles are created so that paddles can be assigned to players
	this.score = 0;
	this.pressingUp = false;
	this.pressingDown = false;
	this.paddle = paddle;
	this.scoreCounter = document.getElementById(scoreCounterId);
	this.fruitCounter = document.getElementById(fruitCounterId);
	this.inventoryDisplay = document.getElementById(inventoryDisplayId);
	this.numFruit = 0;
	this.inventory = [];
	this.inventorySelectionNum = 0;
}
Player.prototype.useItem = function(){
	if(ball.tetheredTo===null && this.inventory.length>0){
		if(this.inventory[this.inventorySelectionNum]==="missile"){
			this.fireMissile();
		}
		this.inventory.splice(this.inventorySelectionNum,1);
		this.inventoryDisplay.innerHTML = "["+ball.owner.inventory+"]";
	}
}
Player.prototype.fireMissile = function(){
	var missileY = this.paddle.y+((this.paddle.h-missileHeight)/2);
	if(this.paddle===lPaddle){
		var missileX = lPaddle.x+lPaddle.w;
		var direction = "right";
	}else if(this.paddle===rPaddle){
		var missileX = rPaddle.x-missileWidth;
		var direction = "left";
	}
	missiles.push(new Missile(missileX,missileY,direction,this.paddle));
	if(this.numFruit===5){
		missileY = this.paddle.y;
		missiles.push(new Missile(missileX,missileY,direction,this.paddle));
		missileY = this.paddle.y+this.paddle.h-missileHeight;
		missiles.push(new Missile(missileX,missileY,direction,this.paddle));
	}
}
var playerL = new Player(lPaddle,"pLScore","pLFruit","pLInventory");
var playerR = new Player(rPaddle,"pRScore","pRFruit","pRInventory");
//Balls:
function Ball(width,tether,player){
	this.w = width;
	this.x = 0;
	this.y = 0;
	this.vLeft = -ballStartingSpeed;
	this.vUp = 0;
	this.tetheredTo = tether;
	this.owner = player;
	if(this.tetheredTo != null){
		if(this.tetheredTo===lPaddle){this.setPos(lPaddle.x+lPaddle.w,lPaddle.y+((lPaddle.h-this.w)/2));
		}else if(this.tetheredTo===rPaddle){
			this.setPos(rPaddle.x-this.w,rPaddle.y+((rPaddle.h-this.w)/2));
		}
	}
}
Ball.prototype.setPos = function(proposedNewX,proposedNewY){ //Sets new position of ball, making sure it is within the canvas and reversed ball direction if needed
	var proposedCentreX = proposedNewX+(this.w/2);
	var proposedCentreY = proposedNewY+(this.w/2);
	checkBallPaddleContact(this,lPaddle);
	checkBallPaddleContact(this,rPaddle);
	checkBallFruitContact(this);
	checkBallCrateContact(this);
	if(proposedNewX<0){
		proposedNewX = 0;//Dont' let the ball leave the left hand side of the canvas
		pointScoredBy(playerR);
	}else if(proposedNewX>canvas.width-this.w){
		proposedNewX = canvas.width - this.w; //Don't let the ball leave the right hand side of the canvas
		pointScoredBy(playerL);
	}
	if(proposedNewY<0){
		proposedNewY = 0; //Don't let the ball leave the top of the canvas
		this.vUp *= -eBallWalls;
	}else if(proposedNewY>canvas.height-this.w){
		proposedNewY = canvas.height-this.w; //Don't let the ball leave the bottom of the canvas
		this.vUp *= -eBallWalls;
	}
	function checkBallPaddleContact(ball,paddle){
		if(ball.vLeft>0 && thereIsLineCircleContact(paddle.x+paddle.w,paddle.y,paddle.y+paddle.h,proposedCentreX,proposedCentreY,ball.w)){
			//If hits right side of paddle while going left, reverse horizontal direction
			ball.vLeft*=-1;
			ball.owner = ball.vLeft < 0 ? playerL : playerR;
			ball.vUp+=(paddle.vUp/10);
		}
		if(ball.vLeft<0 && thereIsLineCircleContact(paddle.x,paddle.y,paddle.y+paddle.h,proposedCentreX,proposedCentreY,ball.w)){
			//If hits left side of paddle while going right, reverse horizontal direction
			ball.vLeft*=-1;
			ball.owner = ball.vLeft < 0 ? playerL : playerR;
			ball.vUp+=(paddle.vUp/10);
		}
		if(ball.vUp>0 && thereIsLineCircleContact(paddle.y+paddle.h,paddle.x,paddle.x+paddle.w,proposedCentreY,proposedCentreX,ball.w)){
			//If hits bottom side of paddle while going up, reverse vertical direction
			ball.vUp*=-1;
		}
		if(ball.vUp<0 && thereIsLineCircleContact(paddle.y,paddle.x,paddle.x+paddle.w,proposedCentreY,proposedCentreX,ball.w)){
			//If hits top side of paddle while going down, reverse vertical direction
			ball.vUp*=-1;
		}
	}
	function checkBallFruitContact(ball){
		var ballCentreX = ball.x + (ball.w/2);
		var ballCentreY = ball.y + (ball.w/2);
		for (var i = 0; i < fruit.length; i++) {
			fruitCentreX = fruit[i].x + (fruit[i].w/2);
			fruitCentreY = fruit[i].y + (fruit[i].w/2);
			if(thereIsCircleCircleContact(ballCentreX,ballCentreY,ball.w,fruitCentreX,fruitCentreY,fruit[i].w)){
				fruit.splice(i,1); 
				if(ball.owner.numFruit<5){
					ball.owner.numFruit+=1;
					ball.owner.fruitCounter.innerHTML = ball.owner.numFruit;
					if(ball.owner.numFruit===5){
						ball.owner.paddle.movingSpeed = 0.6;
						ball.owner.paddle.h = 150;
					}
				}
			}
		};
	}
	function checkBallCrateContact(ball){
		var ballCentreX = ball.x + (ball.w/2);
		var ballCentreY = ball.y + (ball.w/2);
		for (var i = 0; i < crates.length; i++) {
			var crate = crates[i];
			if(thereIsLineCircleContact(crate.y,crate.x,crate.x+crate.w,ballCentreY,ballCentreX,ball.w)//Top side of crate
				|| thereIsLineCircleContact(crate.x+crate.w,crate.y,crate.y+crate.w,ballCentreX,ballCentreY,ball.w)//Right side of crate
				|| thereIsLineCircleContact(crate.y+crate.w,crate.x,crate.x+crate.w,ballCentreY,ballCentreX,ball.w)//Bottom side of crate
				|| thereIsLineCircleContact(crate.x,crate.y,crate.y+crate.w,ballCentreX,ballCentreY,ball.w)){
					if(ball.owner.inventory.length<3){
						ball.owner.inventory.push(crate.goodies);
						ball.owner.inventoryDisplay.innerHTML = "["+ball.owner.inventory+"]";
					}
					crates.splice(i,1);
			}
		};
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
	function thereIsCircleCircleContact(circle1CenterX,circle1CenterY,circle1Width,circle2CenterX,circle2CenterY,circle2Width){
		var contact;
		var a = circle1CenterX;
		var b = circle1CenterY;
		var w1 = circle1Width;
		var c = circle2CenterX;
		var d = circle2CenterY;
		var w2 = circle2Width;
		if(Math.sqrt(((b-d)*(b-d))+((a-c)*(a-c)))<=((w1+w2)/2)){//If distance between circle centers is less than sum of widths...
			contact = true;
			return contact;//...return true!
		}else{
			contact = false;
			return contact;
		}
	}
	this.x = proposedNewX;
	this.y = proposedNewY;
}
//var balls []; - Could use this if want to have multiball
var ball = new Ball(15,lPaddle,playerL);
/*FRUIT*/
function Fruit(xPos,yPos){
	this.x = xPos;
	this.y = yPos;
	this.w = fruitWidth;
}
/*CRATES*/
function Crate(xPos,yPos){
	this.x = xPos;
	this.y = yPos;
	this.w = crateWidth;
	this.goodies = "missile";
}
/*MISSILES*/
function Missile(xPos,yPos,direction,paddleFiredFrom){
	this.x = xPos;
	this.y = yPos;
	this.w = missileWidth;
	this.h = missileHeight;
	this.firedFrom = paddleFiredFrom;
	if(direction === "left"){
		this.vLeft = missileSpeed;
	}else if(direction ==="right"){
		this.vLeft = missileSpeed*-1;
	}
}
Missile.prototype.checkForImpact = function(){
	if(this.x<=0 || this.x >= canvas.width-this.w){
			missiles.splice(missiles.indexOf(this),1);
	}
	for (var i = 0; i < paddles.length; i++) {
		var paddle = paddles[i];
		if(paddle!==this.firedFrom){
			if(this.y>(paddle.y-this.h) && this.y<(paddle.y+paddle.h+this.h) && this.x>(paddle.x-this.w) && this.x<(paddle.x+paddle.w+this.w)){
				missiles.splice(missiles.indexOf(this),1);
				paddle.h /= 2;
			}
		}
	};
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
	frameID = requestAnimationFrame(gameLoop);//requestAnimationFrame calls stretchCanvas and passes the current time as an argument
}

function update(t){
	movePaddles(t);	
	moveBalls(t);
	generateFruit(t);
	generateCrate(t);
	moveMissiles(t);
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
	ctx.arc(ball.x+(ball.w/2),ball.y+(ball.w/2),ball.w/2,0,2*Math.PI,false);//Draw the ball
	ctx.fillStyle = "#000000";
	ctx.fill();
	for (var i = 0; i < fruit.length; i+=1) {
	 	ctx.beginPath();
		ctx.arc(fruit[i].x+(fruit[i].w/2),fruit[i].y+(fruit[i].w/2),fruit[i].w/2,0,2*Math.PI,false);//Draw the fruit
		ctx.fillStyle = "#00ff00";
		ctx.fill();
	};	
	for (var i = 0; i < crates.length; i++) {
	 	ctx.fillStyle = "#ae6a31"; //Set fill colour to brown and...
		ctx.fillRect(crates[i].x,crates[i].y,crates[i].w,crates[i].w); //...draw the crate
	};
	for (var i = 0; i < missiles.length; i++) {
		ctx.fillStyle = "#551a8b"; //Set fill colour to purple and...
		ctx.fillRect(missiles[i].x,missiles[i].y,missiles[i].w,missiles[i].h); //...draw the missile
	};
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

function moveMissiles(t){
	for (var i = 0; i < missiles.length; i++) {
		missiles[i].x -= (missiles[i].vLeft*t);
		missiles[i].checkForImpact();		
	};
}

function generateFruit(t){
	if(fruit.length<3 && ball.tetheredTo === null){
		var randomNumber = Math.random()*avFruitSpawnTime;
		if(randomNumber<=t){
			var newFruitX = (Math.random()*(rPaddle.x-fruitWidth-(lPaddle.x+lPaddle.w)))+lPaddle.x+lPaddle.w;
			var newFruitY = Math.random()*(canvas.height-fruitWidth);
			fruit.push(new Fruit(newFruitX,newFruitY));
		}
	}
}

function generateCrate(t){
	if(crates.length<2 && ball.tetheredTo === null){
		var randomNumber = Math.random()*avCrateSpawnTime;
		if(randomNumber<=t){
			var newCrateX = (Math.random()*(rPaddle.x-crateWidth-(lPaddle.x+lPaddle.w)))+lPaddle.x+lPaddle.w;
			var newCrateY = Math.random()*(canvas.height-crateWidth);
			crates.push(new Crate(newCrateX,newCrateY));
		}
	}
}

function pointScoredBy(scorer){
	scorer.score+=1;
	scorer.scoreCounter.innerHTML = scorer.score;
	ball = new Ball(15,scorer.paddle,scorer);//The old ball object will be garbage collected because there is no way to refer to it, so it won't take up memory
	lPaddle.y = (canvas.height-lPaddle.h)/2;
	rPaddle.y = (canvas.height-rPaddle.h)/2;
	fruit.splice(0,fruit.length);
	crates.splice(0,crates.length);
	var opponent = scorer===playerL ? playerR : playerL;
	if(opponent.numFruit===5){
		opponent.numFruit===0
		opponent.paddle.h = 70;
		opponent.paddle.movingSpeed = 0.4;
		opponent.fruitCounter = document.getElementById(fruitCounterId);
	}
	for (var i = 0; i < paddles.length; i++) {
		paddles[i].h = defaultPaddleHeight;
	};
}

function respondToKey(event){
	if(event.type==="keydown" && event.keyCode===80){
		if(running){
			stop();
		}else{
			start();
		}
	}
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
				if(ball.tetheredTo===lPaddle){//...and the ball is tethered to the left paddle...
					ball.tetheredTo = null;//...untether the ball
				}else{
					playerL.useItem();
				}
			}
			if(event.keyCode===37){//If player presses left...
				if(ball.tetheredTo===rPaddle){//...and the ball is tethered to the right paddle...
					ball.tetheredTo = null;//...untether the ball
				}else{
					playerR.useItem();
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
					player.paddle.vUp = player.paddle.movingSpeed;
				}
			}else if(player.pressingDown){ //If they are only pressing down
				player.paddle.vUp = -1 * player.paddle.movingSpeed;
			}else{ //If they are not pressing up or down
				player.paddle.vUp = 0;
			}
		}
		movePaddle(playerL);
		movePaddle(playerR);
	}	
}

/*EVENT LISTENERS*/
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
//Sometimes it says a player has missiles but they dont
//Paddle hit detection on missiles often doesn't work

/*TO DO LIST*/
//Make player display areas
//Give crates and fruit a lifespan so they don't stay on the canvas forever if not hit
//Make it so you lose one fruit per death rather than all five if you die with five (maybe you lose two if you die with five)
//Add winning score with a winner announcement (maybe players can set winning score at start of game)
//Make player names editable (with a Player.name property to record them)

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