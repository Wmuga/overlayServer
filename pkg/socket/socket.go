package socket

import (
	"log"

	io "github.com/ambelovsky/gosf-socketio"
)

const (
	roomUnknown   = "unknown"
	roomOverlay   = "overlay"
	roomTwitchbot = "twitchBot"
)

const (
	namespace = "/"
	ack       = "OK"
)

func Route(serv *io.Server, conLogger *log.Logger) {
	conRooms := map[string]string{}

	serv.On(io.OnConnection, func(c *io.Channel) {
		c.Join(roomUnknown)
		conLogger.Printf("New connection: %v\n", c.Id())
	})

	serv.On(roomOverlay, func(c *io.Channel) string {
		c.Leave(roomUnknown)
		conRooms[c.Id()] = roomOverlay
		c.Join(roomOverlay)
		conLogger.Printf("Connection %v set as overlay\n", c.Id())
		return ack
	})

	serv.On(roomTwitchbot, func(c *io.Channel) string {
		c.Leave(roomUnknown)
		conRooms[c.Id()] = roomTwitchbot
		c.Join(roomTwitchbot)
		conLogger.Printf("Connection %v set as Twitch bot\n", c.Id())
		return ack
	})

	serv.On(io.OnDisconnection, func(c *io.Channel) {
		delete(conRooms, c.Id())
		conLogger.Printf("Connection %v disconnected\n", c.Id())
	})
}
