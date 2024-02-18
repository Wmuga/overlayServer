package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"server/pkg/overlay"
)

type strBody struct {
	Str string `json:"str"`
}

func GetMusHandler(overlays []overlay.Overlay, l *log.Logger) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			l.Println(err)
			return
		}
		for _, ov := range overlays {
			ov.SendSong(string(body))
		}
	}
}

func GetStrHandler(overlays []overlay.Overlay, l *log.Logger) func(w http.ResponseWriter, r *http.Request) {
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
		for _, ov := range overlays {
			ov.SendViewer(data.Str)
		}
	}
}
