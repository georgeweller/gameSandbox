var canvas = document.getElementById('gameCanvas');
if(canvas.getContext){
	var ctx = canvas.getContext('2d');
}
var avatar = new Image();
avatar.src = "Images/avatar.png";
avatar.onload = function(){setup();};

var canvasWidth = 600;

function setup(){
	canvas.width = canvasWidth;
	canvas.height = 400;
	ctx.drawImage(avatar,10,10);
}

requestAnimationFrame(gameLoop);//Whenever requestAnimationFrame is called on a function, requestAnimationFrame passes an argument to 
//that function which is the timestamp of them the function is called.

function gameLoop(timeStamp){
	canvasWidth+=1;
	draw();
	if(canvasWidth<1000){
		requestAnimationFrame(gameLoop);//requestAnimationFrame calls stretchCanvas and passes the current time as an argument
	}
}

function draw(){
	canvas.width=canvasWidth;
}
