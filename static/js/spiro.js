let canvas
let ctx 
let isDrawing = false
let isClear = true

let R
let r
let d
let a
let x
let y
let coeff
let max_points_count = 40
let points = []

function clear(){
    ctx.clearRect(0,0,canvas.width,canvas.height)
}

function Isetup()
{
    while (!canvas) canvas = document.getElementById('spiro');
    while (!ctx) ctx = canvas.getContext('2d');
    setup()
    setInterval(Idraw,30)
}

function Idraw(){
    if (!isDrawing) {
        isDrawing = true
        draw()
        isDrawing = false
    }
}

function NOD () {
    for (var x = arguments[0], i = 1; i < arguments.length; i++) {
      var y = arguments[i];
      while (x && y) {
        x > y ? x %= y : y %= x;
      }
      x += y;
    }
    return x;
  }

function incAngle(){
    a = (a + coeff*Math.PI/150)% (coeff * 2 * Math.PI)
    //if (Math.cos(a)==1 && Math.cos((R-r)/r*a)==1) a = 0 
}

function rearange(l1,m1,l2,m2,n){
    return (n-l1)/(m1-l1)*(m2-l2)+l2
}

function calcColor(x,y,a){
    let colorR = Number(rearange(canvas.width/2-(R-r+d),R-r+d+canvas.width/2,0,255,x))
    let colorG = Number(rearange(canvas.height/2-(R-r+d),R-r+d+canvas.height/2,0,255,y))
    let colorB = Number(rearange(0,coeff * Math.PI,0,255, Math.abs(coeff * Math.PI - a)))
    return `rgb(${colorR}, ${colorG}, ${colorB})`
}

function calcPoint(){
    x = (R-r)*Math.cos(a)+d*Math.cos((R-r)/r*a)
    y = (R-r)*Math.sin(a)-d*Math.sin((R-r)/r*a)
    x+=canvas.width/2
    y+=canvas.height/2
}

function setup(){
    ctx.lineWidth = 10
    R = canvas.width/5
    r = 0.8*R
    d = R
    a = 0
    calcPoint()
    points.push([x,y,a])
}

function getRandomChange(){
    return [-0.2,-0.1,0,0.1,0.2][Math.floor(Math.random()*5)]
}

function setValues(){
    isClear = false
    if (document.getElementById('rand').checked){
        if (points.length>1 && points[points.length-1][2]<points[points.length-2][2])
        {
            d += getRandomChange()*R
            r += getRandomChange()*R
            d = d % (1.5*R)
            d = d==0? 0.1*R : d 
            r = r % R
            r = r==0 ? 0.1*R : r 
            calcPoint()
            points=[[x,y,a]]
            isClear = true
        }
    }
    else{
        isClear = document.getElementById('clear').checked
        r = R*document.getElementById('r').value
        d = R*document.getElementById('d').value
    }
    coeff = r / NOD(R, r)
}

function draw() {
    setValues()
    if (isClear) clear()
    incAngle()
    calcPoint()
    points.push([x,y,a])
    if (points.length>max_points_count) points.shift()
    for (let i = 1; i<points.length; i++){
        ctx.strokeStyle = calcColor(points[i-1][0],points[i-1][1],points[i-1][2]);
        ctx.beginPath()
        ctx.moveTo(points[i-1][0],points[i-1][1])
        ctx.lineTo(points[i][0],points[i][1])
        ctx.stroke()
    }
    
}