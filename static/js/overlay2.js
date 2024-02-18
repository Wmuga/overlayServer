// TODO:: events. sse connection
const options = {
    options: {
        debug:false,
    },
    connection: {
        reconnect: true,
    },
    channels: ['wmuga'],
};
const hideDelaySec = 2*60;


const client = new tmi.client(options);
let sse = new EventSource("/sse");

const chatContainer = document.querySelector("#chat");

let eventContainer = document.querySelector("#event");
let eventImg = document.querySelector("#event-img");
let eventText = document.querySelector("#event-text");

let musicContainer = document.querySelector("#music");
let musicTitle = document.querySelector("#title");
let musicArtist = document.querySelector("#artist");

let bttvEmotes = get_bttv_emotes();
let twitchBadges = {};
let hideTimeout = -1;

let finished = true;
let eventsQueue = [];

/**
 * Hides chat box
 */
function hideChat(){
    chatContainer.style["opacity"] = 0.1;
}

/**
 * Shows chat box for {hideDelaySec} seconds
 */
function showChat(){
    if (hideTimeout != -1){
        clearTimeout(hideTimeout);
    }
    chatContainer.style["opacity"] = 1;
    setTimeout(hideChat,hideDelaySec*1000)
}

/**
 * Shows given music data. Hides if {data} is null
 * @param {Object} data - music data 
 */
function setMusic(data){
    if (!data){
        musicContainer.style.opacity = 0;
        return;
    }

    musicTitle.innerText = data['track']
    musicArtist.innerText = data['artist']
    musicContainer.style.opacity = 1;
}

/**
 * Replaces twitch and BTTV emotes with img tag
 * @param {Object} emotes - emotes data from twitch
 * @param {string} text - text of chat message
 * @returns {string} processed text
 */
function parseEmotes(emotes,text){
    words = text.split(' ');

    let parsed = {}
    for(let id in emotes){
        for (let length in emotes[id]){
            let len = emotes[id][length].split('-')
            let emote = text.substring(Number(len[0]),Number(len[1])+1)
            parsed[emote] = id
        }
    }
    // Twitch emotes
    for(let i = 0; i < words.length; i++){
        if (!(words[i] in parsed)){
            continue
        }

        let id = parsed[words[i]]
        words[i] = `<img src = http://static-cdn.jtvnw.net/emoticons/v1/${id}/1.0>`
    }
    // BetterTTV emotes
    for(let i = 0; i < words.length; i++){
        if (!(words[i] in bttvEmotes)){
            continue
        }

        words[i] = `<img src = https://cdn.betterttv.net/emote/${bttvEmotes[words[i]]}/1x>`
    }

    return words.join(' ');
}

/**
 * Caps messages in list to 15 entries. Removes "overflowing" mesages
 */
function capMessagesCount(){
    if (chatContainer.children.length > 15){
        chatContainer.removeChild(chatContainer.children[0])
    }
}

/**
 * 
 * @param {string[]} badges - list of links to user's badges
 * @param {string} color  - color of user's name
 * @param {string} username - user's nick
 * @param {HTMLDivElement} msg - parent node
 */
function addUserInfo(badges,color,username,msg){
    let infoNode = document.createElement('div');
    infoNode.classList.add('user-holder');

    let badgesNode = document.createElement('div');
    badgesNode.classList.add('badges');
    for (let badge of badges){
        if (!(badge in twitchBadges)){
            continue;
        }

        let badgeImgNode = document.createElement('img');
        badgeImgNode.src = twitchBadges[badge]['versions'][0]['image_url_2x'];
        badgeImgNode.classList.add('badge');
        badgesNode.appendChild(badgeImgNode);
    }

    let nicknameNode = document.createElement('span');
    nicknameNode.style.color = color || '#EEEEEE';
    nicknameNode.innerText = username+":";

    infoNode.appendChild(badgesNode)
    infoNode.appendChild(nicknameNode)
    msg.appendChild(infoNode);
}

/**
 * @param {string[]} badges - list of links to user's badges
 * @param {string} color  - color of user's name
 * @param {Object} emotes - emotes data from twitch
 * @param {string} username - user's nick
 * @param {string} text - text of chat message
 */
function addMessage(badges,color,emotes,username,text){
    capMessagesCount();
    
    let msgNode = document.createElement('div');
    msgNode.classList.add('msg');
    msgNode.setAttribute('data-username', username);
    addUserInfo(badges, color, username, msgNode);

    text = text.replace(/[<>]/g,'');
    text = parseEmotes(emotes,text);
    let contentNode = document.createElement('div');
    contentNode.classList.add('message');
    contentNode.innerHTML = text;

    msgNode.appendChild(contentNode);
    chatContainer.appendChild(msgNode);
    showChat();
}

/**
 * Deletes all messages from user
 * @param {string} username - who's messages to delete
 */
function deleteUserMessages(username){
    let msgs = [...document.getElementsByClassName('msg')];
    for (let msg of msgs){
        if (msg.getAttribute('data-username').toLowerCase() == username.toLowerCase()){
            chatContainer.removeChild(msg);
        }
    }
}

/**
 * Requests twitch badges
 */
function getBadges(){
    let response = get_twitch_badges()['data'];
    for (let b of response){
        twitchBadges[b["set_id"]] = b;
    }
}

client.on('message',(_,userstate,message) =>{
    addMessage(Object.keys(userstate.badges),userstate.color,userstate.emotes,userstate['display-name'],message);
});

client.on('connected',() =>{
    console.log('connected')
});

client.on('raided',(_, username) =>{
    addEvent("/static/img/raid.gif","Воу, рейд от " +username,"/static/sounds/woah.mp3",5);
    add_new_event('raid',username);
});

client.on('ban',(_,username)=>{
    deleteUserMessages(username);
});

client.on('timeout',(_,username)=>{
    deleteUserMessages(username);
});

sse.addEventListener('music', (musEvent)=>{
    setMusic(JSON.parse(musEvent.data));
});

sse.addEventListener('viewer', (viewerEvent)=>{
    let num = Math.floor(Math.random()*4)+1;
    addEvent("",viewerEvent.data,`/static/sounds/hello/hello${num}.mp3`,5)
}); 

/**
 * Adds multiple messages for testing purpuces
 */
function addTestMessages(){
    for (let i = 1; i < 20; i++){
        addMessage(['moderator', 'vip'],'blue',[],'Owlsforever','msg'+i);
    }
    addMessage(['moderator', 'vip'],'blue',[],'Owlsforever','<span>Test</span>');
}

/**
 * Resolves events from queue
 */
function resolveEvent(){
    if(!finished) return;
    finished = false;
    
    let event = eventsQueue.shift();
    if (event == undefined){
        finished = true;
        return;
    }

    let text = event?.text ?? "New event";
    let timeout = event?.timeout ?? 10*1000;
    let soundSrc = event?.sound ?? "/static/sounds/clem-follow.mp3";

    eventImg.src = event?.img;
    eventText.innerText = text;
    
    let soundNode = document.createElement('audio');
    soundNode.classList.add('viewer-sound');
    
    let soundSrcNode = document.createElement('source');
    soundSrcNode.type='audio/mpeg';
    soundSrcNode.src = soundSrc;
    
    document.body.appendChild(soundNode);
    soundNode.appendChild(soundSrcNode);
    eventContainer.style.opacity = 1;

    soundNode.autoplay = true
    soundNode.play()

    setTimeout(()=>{
        soundNode.removeChild(soundSrcNode);
        soundNode.parentNode.removeChild(soundNode);
        eventContainer.style.opacity = 0;
        finished = true;
    }, timeout)

}

/**
 * Adds event into queue
 * @param {string} img - source of image
 * @param {string} text - text of event
 * @param {string} sound - sound to play with event
 * @param {number} timeout - how long event lasts in seconds
 */
function addEvent(img, text, sound, timeout){
    timeout = timeout*1000;
    let event = {img,text,timeout,sound}
    eventsQueue.push(event)
}

/**
 * Test remove messages
 */
function testRemoveMessages(){
    deleteUserMessages("Owlsforever")
}

/**
 * Tests function setMusic
 */
function testSetMusic(){
    setMusic({"track":"Ladikerfos","artist":"Keygen Church"})
    setTimeout(()=>setMusic(null),5000);
    setTimeout(()=>setMusic({"track":"Very very very very very very long song name that should not fit in the screen","artist":"Keygen Church"}),7000);
}

/**
 * Test event queue
 */
function testEvents(){
    addEvent("/static/img/raid.gif","Спасибо за рейд","/static/sounds/woah.mp3",5);
    addEvent("/static/img/follow.gif","Спасибо за фоллоу","/static/sounds/clem-follow.mp3",5);
    addEvent("","Дарова","/static/sounds/hello/hello1.mp3",5);
}

function setup(){
    client.connect();
    getBadges();
    showChat();
    setInterval(resolveEvent,5*1000)
    addTestMessages();
    // debugRemoveMessages();
    // testSetMusic();
    // testEvents();
}

setup();