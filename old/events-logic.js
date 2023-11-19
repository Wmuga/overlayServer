const sqltie = require('better-sqlite3')
let db = new sqltie(`${__dirname}\\streamDB.db`)

module.exports.check = (event)=>{
    event = convert(event)
    if (event.type=='channel.follow' && isFollowExist(event.nickname)) return
    add_event(event)
    return event
}

module.exports.get10last = ()=>{
    let events = []
    
    for (let row of db.prepare('select * from events order by id desc limit 10').all()){
        events.push(`${row.event_type}: ${row.nickname}`)
    }
    events.reverse()
    return events.join('\r\n')
}

function convert(event){
    let type = event.subscription.type
    let nickname
    switch(type){
        case 'channel.ban':
        case 'channel.unban':
        case 'channel.moderator.add':
        case 'channel.moderator.remove':
        case 'channel.follow':
            nickname = event.event.user_name
            break
        case 'channel.raid':
            nickname = event.event.from_broadcaster_user_name
            break
        case 'channel.poll.begin':
            nickname = event.event.broadcaster_user_name
            break
        case 'channel.poll.end':
            nickname = event.event.broadcaster_user_name
            break     
        default:
            nickname = 'not_implemented'
            break             
    }
    return {
        'type':type,
        'nickname':nickname
    }
}

function add_event(event){
    id = Number(db.prepare('select coalesce(MAX(id),0) id from events').get().id)+1
    db.prepare('insert into events (id,event_type,nickname) values(?, ?, ?)').run(id,event.type,event.nickname)
}

function isFollowExist(nickname){
    return db.prepare(`select * from events where nickname = ?`).get(nickname) ? true : false
}