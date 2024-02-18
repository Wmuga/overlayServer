package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"server/pkg/handlers"
	"server/pkg/middleware"
	"server/pkg/overlay"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"

	io "github.com/ambelovsky/gosf-socketio"
	"github.com/ambelovsky/gosf-socketio/transport"
)

func main() {
	errLogger := log.New(os.Stdout, "[ERR]:", log.Ltime)

	if err := godotenv.Load(); err != nil {
		errLogger.Fatalf(err.Error())
	}

	socketServer := io.NewServer(transport.GetDefaultWebsocketTransport())
	sock := overlay.RouteSocket(socketServer, log.New(os.Stdout, "[SOCK]: ", log.Ltime))
	sse, handler := overlay.NewSSE(log.New(os.Stdout, "[SSE]: ", log.Ltime))
	overlays := []overlay.Overlay{sock, sse}

	statics := handlers.NewStaticData("./static/html/", "./static/")
	twitch := handlers.NewTwitchHandlers(
		os.Getenv("TWITCH_ID"),
		os.Getenv("TWITCH_SECRET"),
		os.Getenv("CHANNEL_ID"),
		errLogger,
		overlays,
	)
	r := mux.NewRouter()

	s := r.PathPrefix("/api/").Subrouter()
	s.HandleFunc("/twitch/badges", twitch.GetTwitchBadges)
	s.HandleFunc("/bttv/global", twitch.GetBttvGlobalEmotes)
	s.HandleFunc("/bttv/channel", twitch.GetBttvChannelEmotes)

	s.HandleFunc("/mus", handlers.GetMusHandler(overlays, errLogger)).Methods("POST")
	s.HandleFunc("/str", handlers.GetStrHandler(overlays, errLogger)).Methods("POST")

	r.HandleFunc("/eventsub/callback/", twitch.EventSub)
	r.PathPrefix("/socket.io").Handler(socketServer)
	r.PathPrefix("/sse").Handler(handler)
	r.PathPrefix("/").HandlerFunc(statics.Static)
	r.Use(middleware.GetRequestsLogger(log.New(os.Stdout, "[REQ]: ", log.Ltime)))

	fmt.Println("Ready to serve at 3000")
	err := http.ListenAndServe("0.0.0.0:3000", r)
	if err != nil {
		fmt.Println(err)
	}
}
