package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"server/pkg/socket"
)

type strBody struct {
	Str string `json:"str"`
}

func GetMusHandler(s *socket.Socket, l *log.Logger) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			l.Println(err)
			return
		}
		s.SendSong(string(body))
	}
}

func GetStrHandler(s *socket.Socket, l *log.Logger) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			l.Println(err)
			return
		}
		var data strBody
		err = json.Unmarshal(body, &data)
		if err != nil {
			l.Println(err)
			return
		}
		s.SendViewer(data.Str)
	}
}
