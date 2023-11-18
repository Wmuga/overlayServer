function requestJson(method,url,headers){
    let req = new XMLHttpRequest();
    req.open(method,url,false);
    for (let key in headers){
        req.setRequestHeader(key,headers[key]);
    }
    req.send();
    return JSON.parse(req.responseText);
}

function request(method,url,headers){
    let req = new XMLHttpRequest();
    req.open(method,url,false);
    for (let key in headers){
        req.setRequestHeader(key,headers[key]);
    }
    req.send();
    return req.responseText;
}

function get_twitch_badges(){
    return requestJson("GET","http://localhost:3000/api/twitch/badges")
}

function get_bttv_global_emotes(){
    return requestJson("GET","http://localhost:3000/api/bttv/global")
}

function get_bttv_channel_emotes(){
    return requestJson("GET","http://localhost:3000/api/bttv/channel")
}

function get_bttv_emotes(){
    let emotes = {}
    let data = get_bttv_global_emotes()
    for (let emote of data){
        emotes[emote['code']]=emote['id']
    }
    data = get_bttv_channel_emotes()
    for (let emote of data['channelEmotes']){
        emotes[emote['code']]=emote['id']
    }
    for (let emote of data['sharedEmotes']){
        emotes[emote['code']]=emote['id']
    }
    return emotes
}