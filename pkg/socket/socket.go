package socket

import (
	"encoding/json"
	"log"
	"server/pkg/events"

	io "github.com/ambelovsky/gosf-socketio"
)

const (
	RoomUnknown   = "unknown"
	RoomOverlay   = "overlay"
	RoomTwitchbot = "twitchBot"
	RoomEventSub  = "eventSub"
)

const (
	namespace = "/"
	ack       = "OK"
)

func errcheck(err error) {
	if err != nil {
		log.Fatalf(err.Error())
	}
}

func Route(serv *io.Server, conLogger *log.Logger) {
	conRooms := map[string]string{}
	/*
		MAIN ROUTES
	*/
	errcheck(serv.On(io.OnConnection, func(c *io.Channel) {
		err := c.Join(RoomUnknown)
		if err != nil {
			conLogger.Println(err.Error())
		}
		conLogger.Printf("New connection: %v\n", c.Id())
	}))

	errcheck(serv.On(RoomOverlay, func(c *io.Channel) string {
		joinNewRoom(c, RoomOverlay, conLogger, conRooms)
		return ack
	}))

	errcheck(serv.On(RoomTwitchbot, func(c *io.Channel) string {
		joinNewRoom(c, RoomTwitchbot, conLogger, conRooms)
		return ack
	}))

	errcheck(serv.On(RoomEventSub, func(c *io.Channel) string {
		joinNewRoom(c, RoomEventSub, conLogger, conRooms)
		return ack
	}))

	errcheck(serv.On(io.OnDisconnection, func(c *io.Channel) {
		delete(conRooms, c.Id())
		conLogger.Printf("Connection %v disconnected\n", c.Id())
	}))

	/*
		ROUTES FOR BOT
	*/

	errcheck(serv.On("last10", func(c *io.Channel) {
		data, err := events.NewEventLogic().GetLast()
		if err != nil {
			conLogger.Printf("Error: %v\n", err)
			return
		}
		bytes, err := json.Marshal(data)
		if err != nil {
			conLogger.Printf("Error: %v\n", err)
			return
		}
		c.Emit("last10", bytes)
	}))

	errcheck(serv.On("song", func(c *io.Channel, song any) {
		if v, ex := conRooms[c.Id()]; !ex || v != RoomTwitchbot {
			return
		}
		conLogger.Println("New song data")
		serv.BroadcastTo(RoomOverlay, "song", song)
	}))

	errcheck(serv.On("viewer", func(c *io.Channel, viewer any) {
		if v, ex := conRooms[c.Id()]; !ex || v != RoomTwitchbot {
			return
		}
		conLogger.Println("New viewer data")
		serv.BroadcastTo(RoomOverlay, "viewer", viewer)
	}))

	errcheck(serv.On("chat", func(c *io.Channel, chat any) {
		if v, ex := conRooms[c.Id()]; !ex || v != RoomTwitchbot {
			return
		}
		conLogger.Println("New chat data")
		serv.BroadcastTo(RoomOverlay, "chat", chat)
	}))
}

func joinNewRoom(c *io.Channel, room string, l *log.Logger, rooms map[string]string) {
	err := c.Leave(RoomUnknown)
	if err != nil {
		l.Println(err.Error())
	}
	rooms[c.Id()] = room
	err = c.Join(RoomEventSub)
	if err != nil {
		l.Println(err.Error())
	}
	l.Printf("Connection %v set as %v\n", c.Id(), room)
}
