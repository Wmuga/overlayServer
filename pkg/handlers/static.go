package handlers

import (
	"net/http"
	"path/filepath"
	"strings"
)

type StaticData struct {
	static    http.Handler
	htmlsPath string
}

func NewStaticData(htmlsPath, staticFolder string) *StaticData {
	return &StaticData{
		static: http.StripPrefix(
			"/static/",
			http.FileServer(http.Dir(staticFolder)),
		),
		htmlsPath: htmlsPath,
	}
}

func (data *StaticData) Static(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, ".") {
		data.static.ServeHTTP(w, r)
		return
	}
	data.Html(w, r)
}

func (data *StaticData) Html(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	path := strings.Split(r.URL.Path, "/")
	file := path[len(path)-1]
	http.ServeFile(w, r, filepath.Join(data.htmlsPath, file+".html"))
}
