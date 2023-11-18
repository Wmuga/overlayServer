package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type TwitchHandlers struct {
	client       http.Client
	clientID     string
	clientSecret string
	channelID    string
	logger       *log.Logger
}

type accessTokenT struct {
	Token string `json:"access_token"`
}

const (
	urlReqTokenBase = "https://id.twitch.tv/oauth2/token?client_id=%v&client_secret=%v&grant_type=client_credentials"
	urlBadges       = "https://badges.twitch.tv/v1/badges/global/display"
	urlChannelInfo  = "https://api.twitch.tv/helix/users?login=%v"
	urlBttvGlobal   = "https://api.betterttv.net/3/cached/emotes/global"
	urlBttvChannel  = "https://api.betterttv.net/3/cached/users/twitch/%v"
)

func NewTwitchHandlers(clientID, clientSecret, channelID string, errLogger *log.Logger) *TwitchHandlers {
	return &TwitchHandlers{
		client:       http.Client{},
		clientID:     clientID,
		clientSecret: clientSecret,
		channelID:    channelID,
		logger:       errLogger,
	}
}

func (h *TwitchHandlers) GetBttvChannelEmotes(w http.ResponseWriter, r *http.Request) {
	url := fmt.Sprintf(urlChannelInfo, h.channelID)
	resp, err := h.request("GET", url, nil)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) GetBttvGlobalEmotes(w http.ResponseWriter, r *http.Request) {
	resp, err := h.request("GET", urlBttvGlobal, nil)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
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
		return
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) GetTwitchBadges(w http.ResponseWriter, r *http.Request) {
	resp, err := h.request("GET", urlBadges, nil)
	if err != nil {
		h.logger.Println(err)
		w.WriteHeader(500)
		return
	}

	h.writeResponse(w, resp)
}

func (h *TwitchHandlers) getHelixHeaders() (map[string]string, error) {
	token, err := h.requestToken()
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"Client-ID":     h.clientID,
		"Authorization": token,
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
	if err != nil {
		return r, err
	}
	var res T
	err = json.Unmarshal(resp, &res)
	if err != nil {
		return r, err
	}
	return res, nil
}

func (h *TwitchHandlers) request(method string, url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	if headers != nil {
		for name, value := range headers {
			req.Header.Set(name, value)
		}
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
	return bytes, nil
}

func (h *TwitchHandlers) writeResponse(w http.ResponseWriter, bytes []byte) {
	_, err := w.Write(bytes)

	if err != nil {
		h.logger.Println(err)
	}
}
