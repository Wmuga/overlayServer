let canvas
let ctx 
let isDrawing = false
let field
let pix_size = 4

function Isetup()
{
    while (!canvas) canvas = document.getElementById('spiro');
    while (!ctx) ctx = canvas.getContext('2d');
    setup()
    setInterval(Idraw,250)
}

function Idraw(){
    if (!isDrawing) {
        isDrawing = true
        draw()
        isDrawing = false
    }
}

function clear(){
    ctx.clearRect(0,0,canvas.width,canvas.height)
}

function setup(){
    ctx.fillStyle='green'
    field = new Array(canvas.width/pix_size).fill(0).map(x=>new Array(canvas.height/pix_size).fill(0))

    canvas.addEventListener("mousedown", function(e) {
        var x = Math.floor(e.x/4)-2;
        var y = Math.floor(e.y/4)-2;
        field[x][y]=1
    }, true);
}

function draw_pix(x,y){
    if(field[x][y]==1) {
        ctx.fillRect(x*pix_size,y*pix_size,pix_size,pix_size)
    }
}


function draw(){
    for (let x=0;x<canvas.width/pix_size;x++)
        for (let y=0;y<canvas.height/pix_size;y++){
            draw_pix(x,y)
        }  
}