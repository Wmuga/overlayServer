// TODO:: events. sse connection. music overlay
const options = {
    options: {
        debug:false,
    },
    connection: {
        reconnect: true,
    },
    channels: ['wmuga'],
};
const client = new tmi.client(options)

const hideDelaySec = 2*60;

let chat = document.querySelector("#chat");
let events = document.querySelector("#event");
let music = document.querySelector("#event");

let bttvEmotes = get_bttv_emotes();
let twitchBadges = {};
let hideTimeout = -1;

function hideChat(){
    chat.style["opacity"] = 0.1;
}

function showChat(){
    if (hideTimeout != -1){
        clearTimeout(hideTimeout);
    }
    chat.style["opacity"] = 1;
    setTimeout(hideChat,hideDelaySec*1000)
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
        let len = emotes[id].length.split('-')
        let emote = text.substring(Number(len[0]),Number(len[1])+1)
        parsed[emote] = id
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
    if (chat.children.length > 15){
        chat.removeChild(chat.children[0])
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

    let badgesContainer = document.createElement('div');
    badgesContainer.classList.add('badges');
    for (let badge of badges){
        if (!(badge in twitchBadges)){
            continue;
        }

        let badgeImg = document.createElement('img');
        badgeImg.src = twitchBadges[badge]['versions'][0]['image_url_2x'];
        badgeImg.classList.add('badge');
        badgesContainer.appendChild(badgeImg);
    }

    let nickname = document.createElement('span');
    nickname.style.color = color || '#EEEEEE';
    nickname.innerText = username+":";

    infoNode.appendChild(badgesContainer)
    infoNode.appendChild(nickname)
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
    
    let msg = document.createElement('div');
    msg.classList.add('msg');
    msg.setAttribute('data-username', username);
    addUserInfo(badges, color, username, msg);

    text = text.replace(/[<>]/g,'');
    text = parseEmotes(emotes,text);
    let content = document.createElement('div');
    content.classList.add('message');
    content.innerHTML = text;

    msg.appendChild(content);
    chat.appendChild(msg);
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
            chat.removeChild(msg);
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

// client.on('raided',(_, username) =>{
//     add_new_event('raid',username)
// })

client.on('ban',(_,username)=>{
    deleteUserMessages(username)
})

client.on('timeout',(_,username)=>{
    deleteUserMessages(username)
})


/**
 * Adds multiple messages for debugging purpuces
 */
function addDebugMessages(){
    for (let i = 1; i < 20; i++){
        addMessage(['moderator', 'vip'],'blue',[],'Owlsforever','msg'+i);
    }
    addMessage(['moderator', 'vip'],'blue',[],'Owlsforever','<span>Test</span>');
}

/**
 * Test remove messages
 */
function debugRemoveMessages(){
    deleteUserMessages("Owlsforever")
}

function setup(){
    client.connect();
    getBadges();
    showChat();
    addDebugMessages();
    // debugRemoveMessages();
}

setup();