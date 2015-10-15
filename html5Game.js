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

