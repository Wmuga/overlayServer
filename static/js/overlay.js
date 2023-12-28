const options = {
    options: {
        debug:false,
    },
    connection: {
        reconnect: true,
    },
    channels: ['wmuga'],
};


let badges = {}
let bttv_emotes = get_bttv_emotes()
let song_overlay = document.getElementsByClassName('song-overlay')[0]
let socket = io('ws://localhost:3000', {transports: ['websocket']})
let finished = true

function parse_emote_data(data){
    let parsed_data = {}
    for (let id in data){
        for (let length in data[id]){
            length=data[id][length].split('-')
            parsed_data[id] = {"start":Number(length[0]),"length":(Number(length[1])-Number(length[0])+1)}
        }
    } 
   return parsed_data;
}

function emote_parse(emotes,message){
    emotes = parse_emote_data(emotes);
    splitted_message=message.split(' ');
    for (let id in emotes){
        let emote_code = message.substring(emotes[id].start,emotes[id].start+emotes[id].length);
        for (let i =0; i<splitted_message.length;i++){
            if (splitted_message[i]==emote_code) splitted_message[i] = '<img src = http://static-cdn.jtvnw.net/emoticons/v1/'+id+'/1.0>';
        }
    }
    return splitted_message.join(' ');
}

function emote_parse_bttv(message){
    splitted_message=message.split(' ')
    for (let i=0;i<splitted_message.length;i++){
        if (splitted_message[i] in bttv_emotes){
            splitted_message[i] = `<img src = https://cdn.betterttv.net/emote/${bttv_emotes[splitted_message[i]]}/1x>`
        }
    }
    return splitted_message.join(' ')
}

function add_new_message(userstate,message){
    if (document.getElementsByClassName('msg').length>15) {
        let messages = document.getElementsByClassName('msg')
        messages[0].parentElement.removeChild(messages[0])
    }

    let new_msg = document.createElement('div')
    new_msg.classList.add('msg-container')

    let usrColor = userstate.color ||'#EEEEEE'
    let usrMessage = document.createElement('div')
    usrMessage.innerText = message
    usrMessage.classList.add('msg')

    
    let top_container = document.createElement('div')
    top_container.style.border = `4px solid ${usrColor}`
    top_container.classList.add('top-container')
    new_msg.appendChild(top_container)

    let badges_container = document.createElement('div')
    top_container.appendChild(badges_container)
    badges_container.classList.add('badges-container')
    badges_container.style['border-right']= `4px solid ${usrColor}`

    for (let badge in userstate.badges)
        {
            let badge_img = document.createElement('img')
            badge_img.src = badges[badge]['versions'][0]['image_url_2x']
            badge_img.classList.add('badge')
            badges_container.appendChild(badge_img)
        }

    let username = document.createElement('div')
    username.classList.add('msg-username') 
    top_container.appendChild(username)

    if (userstate['message-type']=='action') usrMessage.style.color = usrColor
    username.innerHTML = userstate['display-name'];
    
    usrMessage.innerHTML = emote_parse_bttv(emote_parse(userstate.emotes,usrMessage.innerText))
    new_msg.appendChild(usrMessage)

    document.getElementsByClassName('chat')[0].appendChild(new_msg)
}

function delete_messages_from_user(username){
    for (let element of document.getElementsByClassName('msg-username')){
        if (element.innerHTML.toLowerCase()==username){
            element.parentElement.parentElement.parentElement.removeChild(element.parentElement.parentElement)
        }
    }
}

const client = new tmi.client(options)

console.log('Connecting')

client.on('message',(_,userstate,message) =>{
    add_new_message(userstate,message);    
});

client.on('connected',() =>{
    console.log('connected')
    let bs = get_twitch_badges()['data']
    for (let b of bs){
        badges[b["set_id"]] = b
    }
});

client.on('raided',(_, username) =>{
    add_new_event('raid',username)
})

client.on('ban',(_,username)=>{
    delete_messages_from_user(username)
})

client.on('timeout',(_,username)=>{
    delete_messages_from_user(username)
})

client.connect();

event_array = [];

function add_new_event(_event,_name){
    event_array.splice(0,0,{
        event:_event,
        name:_name
    })
}

function play_sound(sound_class){
    let audio = document.getElementsByClassName(sound_class)[0]
    audio.autoplay = true
    audio.play()
}

function set_any_event(text,timeout,sound,image_url){
    let event = document.createElement('div')
    let event_image = document.createElement('img')
    event_image.src = image_url
    event.classList.add('event')
    event_image.classList.add('event-img')
    event.innerText = text
    document.getElementsByClassName('event_overlay')[0].appendChild(event)
    document.getElementsByClassName('event_overlay')[0].appendChild(event_image)
    play_sound(sound)
    return new Promise(resolve => setTimeout(function(){
        event.parentNode.removeChild(event)
        event_image.parentNode.removeChild(event_image)
        resolve()
    },timeout))
}

function set_follow_event(name){
    return set_any_event(`Спасибо за фоллоу, ${name}`,4000,'follow-sound','/static/img/follow.gif')
}

function set_raid_event(name){
    return set_any_event(`Воу! рейд от ${name}`,4000,'raid-sound','/static/img/raid.gif')
}

function set_viewer_event(data){
    let event = document.createElement('div');
    event.classList.add('viewer');
    event.innerText = data;
    let sound = document.createElement('audio')
    sound.classList.add('viewer-sound')
    document.body.appendChild(sound)
    document.body.appendChild(event);
    let sound_src = document.createElement('source')
    sound_src.type='audio/mpeg'
    sound_src.src = `/static/sounds/hello/hello${Math.floor(Math.random()*4)+1}.mp3`
    sound.appendChild(sound_src)
    play_sound('viewer-sound');
    return new Promise(resolve => setTimeout(function(){
        sound.parentNode.removeChild(sound)
        event.parentNode.removeChild(event);
        sound.removeChild(sound_src)
        resolve();
    },4000))
}
async function resolve_events(){
    if (!finished) return

    finished = false
    if (event_array.length>0){
        let event = event_array.pop();
        switch (event.event){
            default:
                break;
            case ('follow'):
                await set_follow_event(event.name);
                break;   
            case ('raid'):
                await set_raid_event(event.name);
                break;
            case ('viewer'):
                await set_viewer_event(event.name);
                break;    
        }
     }
     finished = true
}

function change_chat_width(width){
    let chat = document.getElementsByClassName('chat-container')[0]
    chat.style.width = width
}

socket.on('connect',()=>{
    socket.emit('overlay')
})

socket.on('song',(data)=>{
	console.log(data)
    if (data && data !='\"null\"' && data!='null'){
        data = JSON.parse(data)
        song_overlay.style.opacity = 1
        document.getElementsByClassName('artist')[0].innerHTML = data['artist']
        document.getElementsByClassName('song-name')[0].innerHTML = data['track']
        document.getElementsByClassName('song-img')[0].src=data['img']?? 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-oHvI4bjEgj3l-hq3wRbIsbknaXxdpJBeew&usqp=CAU'
    }else{
        song_overlay.style.opacity = 0
    }
})

socket.on('viewer',(data)=>{
    add_new_event('viewer',data)
})

socket.on('data',(data)=>{
    data = JSON.parse(data)
    switch(data['subscription']['type']){
        case 'channel.follow':
            add_new_event('follow',data['event']['user_name'])
            break;
    }
})

socket.on('chat',(chat_data)=>{
    switch(chat_data){
        case 'quad':
            change_chat_width(475)
            break
        default:
        case 'normal':
            change_chat_width(250)
            break
    }
})

setInterval(resolve_events,500)