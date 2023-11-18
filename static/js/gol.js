let canvas
let ctx 
let isDrawing = false
let isClear = true
let field
let field1
let pix_size = 4
let iterations
let iterations_max

function Isetup()
{
  while (!canvas) canvas = document.getElementById('spiro');
  while (!ctx) ctx = canvas.getContext('2d');
  setup()
  setInterval(Idraw,50)
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
  set_random_start()
  field1 = clone(field)
  iterations = 0
}

function randInt(min,max){
  return Math.floor(Math.random()*(max+1-min))+min
}

function distance(x1,y1,x2,y2){
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1))
}

function set_random_start(){
  let tries = randInt(3,15)
  iterations_max = tries*50
  for (let i=0;i<tries;i++){
    let width = randInt(2,15)
    let x = randInt(0,canvas.width/pix_size-1)
    let y = randInt(0,canvas.height/pix_size-1)
    for (let iX=x-width;iX<=x+width;iX++){
      for (let iY=y-width;iY<=y+width;iY++){
        if (distance(x,y,iX,iY)<=width && Math.random()<0.5){
          at(iX,iY,1)
        }
      }
    }
  }
}

function draw_pix(x,y){
  if(field[x][y]==1) {
    ctx.fillRect(x*pix_size,y*pix_size,pix_size,pix_size)
  }
}

function count_neighbours(x,y){
  count = 0
  for (let iX=x-1;iX<=x+1;iX++){
    for (let iY=y-1;iY<=y+1;iY++)
      count+=at(iX,iY)
  }
  return count-at(x,y)
}

function logic(x,y){
  neighbours = count_neighbours(x,y)
  if (field[x][y]){
    if (neighbours>3 || neighbours<2) {
    field1[x][y]=0
    return 1
    } 
  return 0
  }else{
    if(neighbours==3) {
      field1[x][y]=1
      return 1
    }
    return 0
  }
}

const clone = items =>
  items.map(item => (Array.isArray(item) ? clone(item) : item))

function draw(){
  clear()
  let count = 0
  for (let x=0;x<canvas.width/pix_size;x++)
    for (let y=0;y<canvas.height/pix_size;y++){
      draw_pix(x,y)
      count += logic(x,y)
    }
  iterations += 1  
  field = clone(field1)  
  if (iterations>iterations_max) setup()  
}

function at(x,y,value){
  if (x<0) x = canvas.width/pix_size+x
  if (y<0) y = canvas.height/pix_size+y
  x = x % (canvas.width/pix_size)
  y = y % (canvas.height/pix_size)
  if (value!=undefined) field[x][y] = value 
  return field[x][y]
}