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

function request_twitch_id(){
    return 'o6bs6xllkahuule280urkn8y4vpylt'
}

function request_twitch_secret(){
    return 'dumtdlcn7y9v1l9yn6t3kla3dl575u'
}

let token = 'no_token';

function request_token_json(){
    let url = 'https://id.twitch.tv/oauth2/token';
    url+='?client_id='+request_twitch_id();
    url+='&client_secret='+request_twitch_secret();
    url+='&grant_type=client_credentials';
    let json = requestJson('POST',url);
    setTimeout(()=>{
        token = 'no_token';
    },json.expires_in/3);
    return json;
}

function request_token(){
    if (token=='no_token') token = request_token_json().access_token; 
    return `Bearer ${token}`;
}

function get_helix_headers(){
    return {"Client-ID":request_twitch_id(),"Authorization":request_token()};
}

function request_channel_info(login){
    return requestJson('GET',`https://api.twitch.tv/helix/users?login=${login}`,get_helix_headers());
}

function get_subscriber_badges(channel_id){
    return requestJson('GET',`https://api.twitch.tv/kraken/chat/${channel_id}/badges`,{Accept:'application/vnd.twitchtv.v5+json',"Client-ID":request_twitch_id()}).subscriber;
}

function get_bttv_global_emotes(){
    return requestJson('GET',`https://api.betterttv.net/3/cached/emotes/global`)
} 

function get_bttv_channel_emotes(channel_id){
    return requestJson('GET',`https://api.betterttv.net/3/cached/users/twitch/${channel_id}`)
}

function get_bttv_emotes(channel_id){
    let emotes = {}
    let data = get_bttv_global_emotes()
    for (let emote of data){
        emotes[emote['code']]=emote['id']
    }
    data = get_bttv_channel_emotes(channel_id)
    for (let emote of data['channelEmotes']){
        emotes[emote['code']]=emote['id']
    }
    for (let emote of data['sharedEmotes']){
        emotes[emote['code']]=emote['id']
    }
    return emotes
}