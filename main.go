package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"server/pkg/handlers"
	"server/pkg/middleware"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	errLogger := log.New(os.Stdout, "[ERR]:", log.Ltime)

	if err := godotenv.Load(); err != nil {
		errLogger.Fatalf(err.Error())
	}

	statics := handlers.NewStaticData("./static/html/", "./static/")
	twitch := handlers.NewTwitchHandlers(
		os.Getenv("TWITCH_ID"),
		os.Getenv("TWITCH_SECRET"),
		os.Getenv("CHANNEL_ID"),
		errLogger,
	)
	r := mux.NewRouter()

	s := r.PathPrefix("/api/").Subrouter()
	s.HandleFunc("/twitch/badges", twitch.GetTwitchBadges)
	s.HandleFunc("/bttv/global", twitch.GetBttvGlobalEmotes)
	s.HandleFunc("/bttv/channel", twitch.GetBttvChannelEmotes)

	r.PathPrefix("/").HandlerFunc(statics.Static)
	r.Use(middleware.GetRequestsLogger(log.New(os.Stdout, "[REQ]:", log.Ltime)))

	fmt.Println("Ready to serve at 3000")
	err := http.ListenAndServe("0.0.0.0:3000", r)
	if err != nil {
		fmt.Println(err)
	}
}
