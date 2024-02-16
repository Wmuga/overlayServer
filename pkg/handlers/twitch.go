package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"server/pkg/events"
	"server/pkg/eventsub"
	"server/pkg/overlay"

	"github.com/gorilla/mux"
)

type TwitchHandlers struct {
	client       http.Client
	clientID     string
	clientSecret string
	channelID    string
	logger       *log.Logger
	logic        *events.DBEventLogic
	overlay      overlay.Overlay
}

type accessTokenT struct {
	Token string `json:"access_token"`
}

const (
	urlReqTokenBase = "https://id.twitch.tv/oauth2/token?client_id=%v&client_secret=%v&grant_type=client_credentials"
	urlBadges       = "https://api.twitch.tv/helix/chat/badges/global"
	urlChannelInfo  = "https://api.twitch.tv/helix/users?login=%v"
	urlBttvGlobal   = "https://api.betterttv.net/3/cached/emotes/global"
	urlBttvChannel  = "https://api.betterttv.net/3/cached/users/twitch/%v"
)

var (
	errBadStatus = errors.New("bad status code")
)

func NewTwitchHandlers(clientID, clientSecret, channelID string, errLogger *log.Logger, overlay overlay.Overlay) *TwitchHandlers {
	return &TwitchHandlers{
		client:       http.Client{},
		clientID:     clientID,
		clientSecret: clientSecret,
		channelID:    channelID,
		logger:       errLogger,
		logic:        events.NewEventLogic(),
		overlay:      overlay,
	}
}

func (h *TwitchHandlers) GetBttvChannelEmotes(w http.ResponseWriter, r *http.Request) {
	url := fmt.Sprintf(urlBttvChannel, h.channelID)
	resp, err := h.request("GET", url, nil)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) GetBttvGlobalEmotes(w http.ResponseWriter, r *http.Request) {
	resp, err := h.request("GET", urlBttvGlobal, nil)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) GetChannelInfo(w http.ResponseWriter, r *http.Request) {
	login := mux.Vars(r)["login"]
	url := fmt.Sprintf(urlChannelInfo, login)
	headers, err := h.getHelixHeaders()
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	resp, err := h.request("GET", url, headers)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) GetTwitchBadges(w http.ResponseWriter, r *http.Request) {
	headers, err := h.getHelixHeaders()
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	resp, err := h.request("GET", urlBadges, headers)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) EventSub(w http.ResponseWriter, r *http.Request) {
	es := &eventsub.EventSub{}

	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	err = json.Unmarshal(bytes, es)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	if es.Challenge != "" {
		h.writeResponse(w, []byte(es.Challenge))
		return
	}

	ed := eventsub.Convert(*es)
	err = h.logic.AddEvent(ed)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	h.overlay.SendEventLog(fmt.Sprintf("\r\n%v: %v", ed.Type, ed.Nickname))
	bytes, err = json.Marshal(ed)
	if err != nil {
		h.logger.Println(err)
		return
	}
	h.overlay.SendEventSub(string(bytes))
}

func (h *TwitchHandlers) getHelixHeaders() (map[string]string, error) {
	token, err := h.requestToken()
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"Client-ID":     h.clientID,
		"Authorization": fmt.Sprintf("Bearer %v", token),
	}, nil
}

func (h *TwitchHandlers) requestToken() (string, error) {
	url := fmt.Sprintf(urlReqTokenBase, h.clientID, h.clientSecret)
	resp, err := requestJson[accessTokenT](h, "POST", url, nil)
	if err != nil {
		return "", err
	}
	return resp.Token, nil
}

func requestJson[T any](h *TwitchHandlers, method string, url string, headers map[string]string) (r T, e error) {
	resp, err := h.request(method, url, headers)
	if err != nil && err != errBadStatus {
		return r, err
	}
	var res T
	err = json.Unmarshal(resp, &res)
	if err != nil {
		return r, err
	}
	return res, err
}

func (h *TwitchHandlers) request(method string, url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	for name, value := range headers {
		req.Header.Set(name, value)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode/100 != 2 {
		return bytes, errBadStatus
	}

	return bytes, nil
}

func (h *TwitchHandlers) writeResponse(w http.ResponseWriter, bytes []byte) {
	_, err := w.Write(bytes)

	if err != nil {
		h.logger.Println(err)
	}
}
