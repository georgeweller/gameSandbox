var canvas = document.getElementById('gameCanvas');
if(canvas.getContext){
	var ctx = canvas.getContext('2d');
}
var avatar = document.images[0];

function setup(){
	canvas.width=400;
	canvas.height=300;
	ctx.drawImage(avatar,100,100);
}

setup();