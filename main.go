package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"server/pkg/handlers"
	"server/pkg/middleware"

	"github.com/gorilla/mux"
)

func main() {
	statics := handlers.NewStaticData("./static/html/", "./static/")
	r := mux.NewRouter()
	r.PathPrefix("/").HandlerFunc(statics.Static)
	r.Use(middleware.GetRequestsLogger(log.New(os.Stdout, "[REQ]:", log.Ltime)))

	fmt.Println("Ready to serve at 3000")
	err := http.ListenAndServe("0.0.0.0:3000", r)
	if err != nil {
		fmt.Println(err)
	}
}
