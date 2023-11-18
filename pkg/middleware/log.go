package middleware

import (
	"log"
	"net/http"
)

func GetRequestsLogger(logger *log.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			logger.Printf("[%v]: %v\n", r.Method, r.URL)
			next.ServeHTTP(w, r)
		})
	}
}
