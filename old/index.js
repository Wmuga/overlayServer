const http = require('http')
const {execFile} = require('child_process')
const fs = require('fs')
const urlObject = require('url')
const eventsLogic = require('./events-logic')
let socketServer = http.createServer()
const io = require('socket.io')(socketServer)

execFile('D:\\Programs\\Ngrok\\ngrok.exe', 'http -host-header=rewrite 192.168.1.3:3000'.split(' '))

function sendRequest(method,url,callback,body,headers){
    let object = new urlObject.URL(url)
    let opt ={
        host: object.hostname,
        path: object.pathname+object.search,
        method: method
    }
    if (object.port) opt.port = object.port
    if (headers) opt.headers = headers
    let request = http.request(opt,callback)
    if (body) request.write(body)
    request.end()
}

function searchParamsToJson(searchParams){
    let object = {}
    for (const name of searchParams.keys()){
        object[name]=searchParams.get(name)
    }
    return object
}

let urlCallbackDict = {
    "/": (req,res,body,query,url)=>{
        res.writeHead(200)
        res.end(url)
    },
    "/favicon.ico":(req,res)=>{
        res.writeHead(404)
        res.end()
    },
    "/eventsub/callback/":(req,res,body)=>{
        res.writeHead(200)
        body = JSON.parse(body)
        if ('challenge' in body){
            console.log('new Sub')
            res.end(body['challenge'])
        }
        else{
            let event = eventsLogic.check(body)
            if (event) {   
                console.log('Data at evensub')
                console.log(body)
                console.log(event)
                sockets['eventSub'].forEach((client)=>{
                    client.emit('data',`\r\n${event.type}: ${event.nickname}`)
                })
                sockets['overlay'].forEach((client)=>{
                    client.emit('data',JSON.stringify(body))
                })
            }
           res.end()
        }
    },
    "/overlay": (req,res,body,query)=>{
        if (query['sdf']!='frghjk'){
            res.writeHead(403)
            res.end()
        }
        else{
            let stream = fs.createReadStream((__dirname+'/server/overlay/index.html').split('/').join('\\'))
            stream.pipe(res)
        }
    },
    "/overlay/twitch_request.js": (req,res,body,query)=>{
        if (query['sdfgfd']!='rtyrty'){
            res.writeHead(403)
            res.end()
        }
        else{
            let stream = fs.createReadStream((__dirname+'/server/overlay/twitch_request.js').split('/').join('\\'))
            stream.pipe(res)
        }
    },
    "/file":(req,res,body,query)=>{
        if (req.method=='POST'){
            fs.writeFileSync(__dirname+"/temp",body)
            res.writeHead(200)
            res.end("Ok")
        }else{
            res.writeHead(404)
            res.end()
        }
    }   
}

function getBody(req){
    let body = ''
    return new Promise(resolve=>{
        req.on('data',chunk=>body+=chunk)
        req.on('end',()=>resolve(body))
    })
}

async function listener(req,res){
    let object = new urlObject.URL(`http://localhost:3000${req.url}`)
    let reqBody = await getBody(req)
    console.log(req.url)
    if(object.pathname in urlCallbackDict){
        urlCallbackDict[object.pathname](req,res,reqBody,searchParamsToJson(object.searchParams),url)
    }
    else{
        switch(req.method){
            case 'GET':
                {
                    let path =  __dirname+'/server'+object.pathname + (object.pathname.includes('.') ? '' : '/'+'index.html')
                    if (!(/\.\.[\\/]/i).test(path)){
                        path = path.split('/').join('\\')
                        if (fs.existsSync(path)){
                            res.writeHead(200)
                            let stream = fs.createReadStream(path)
                            stream.pipe(res)
                        }
                        else{
                            console.log('Unknown GET')
                            console.log(req.headers)
                            res.writeHead(404)
                            res.end()
                        }
                    }else{
                        console.log('Blocked GET')
                            res.writeHead(403)
                            res.end()
                    }
                }
                break
            case 'POST':
                {
                    console.log(reqBody)
                    console.log(req.headers)
                    res.writeHead(404)
                    res.end()  
                }    
            default:
                res.writeHead(404)
                res.end()
                break
        }
    }
}

let url

setTimeout(()=>{
    let callback = function(response){
        let str = ''
        response.on('data',chunk=>{str+=chunk}) 
        response.on('end',()=>{
            str = JSON.parse(str)
            str['tunnels'].forEach(data => {
                if(data['proto']=='https') url = data['public_url']
            });
        })
    }
    sendRequest('GET','http://localhost:4040/api/tunnels',callback)
},2000)

let server = http.createServer(listener)

server.listen(3000,'192.168.1.3',async ()=>{
    while (!url) await new Promise(resolve=>setTimeout(resolve,500))
    console.log('Server is running at 192.168.1.3:3000')
    console.log('Current url:',url)
})

let sockets = {
    'unknown':[],
    'eventSub':[],
    'overlay':[],
    'twitchBot':[]
}

socketServer.listen(3001,'192.168.1.3',()=>{
    console.log('Socket server is up at 3001')
})

function removeByValue(arr,filterValue){
    return arr.filter(function(value){return value!=filterValue})
}

function removeEverywhere(client){
    for(let key in sockets){
        sockets[key] = removeByValue(sockets[key],client)
    }
}

io.on('connection',client=>{
    console.log('Client connected')
    sockets['unknown'].push(client)
    client.on('eventSub',()=>{
        console.log('Client sub to eventSub')
        removeEverywhere(client)
        sockets['eventSub'].push(client)
    })
    client.on('last10',()=>{
        client.emit('last10',eventsLogic.get10last())
        console.log('Sent last 10 events')
    })
    client.on('overlay',()=>{
        console.log('Client set to overlay')
        removeEverywhere(client)
        sockets['overlay'].push(client)
    })
    client.on('twitchBot',()=>{
        console.log('Client set to bot')
        removeEverywhere(client)
        sockets['twitchBot'].push(client)
        client.on('song',(song_data)=>{
            for(let overlay_client of sockets['overlay']){
                overlay_client.emit('song',song_data)
            }
        })
        client.on('viewer',(viewer_data)=>{
            for(let overlay_client of sockets['overlay']){
                overlay_client.emit('viewer',viewer_data)
            }
        })
        client.on('chat',(chat_data)=>{
            for(let overlay_client of sockets['overlay']){
                overlay_client.emit('chat',chat_data)
            }
        })
    })
    client.on('disconnect',()=>{
        console.log('Client disconnect')
        removeEverywhere(client)
    })
})