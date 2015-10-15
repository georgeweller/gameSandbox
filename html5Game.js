var canvas = document.getElementById('gameCanvas');
if(canvas.getContext){
	var ctx = canvas.getContext('2d');
}
var avatar = new Image();
avatar.src = "Images/avatar.png";
avatar.onload = function(){setup();};

function setup(){
	canvas.width = 600;
	canvas.height = 400;
	ctx.drawImage(avatar,10,10);
}

requestAnimationFrame(updateCanvas);//Whenever requestAnimationFrame is called on a function, requestAnimationFrame passes an argument to 
//that function which is the timestamp of them the function is called.

function updateCanvas(timeStamp){
	canvas.width+=1;
	if(canvas.width<1000){
		requestAnimationFrame(updateCanvas);//requestAnimationFrame calls stretchCanvas and passes the current time as an argument
	}
}

