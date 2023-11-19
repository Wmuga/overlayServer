package middleware

import (
	"log"
	"net/http"
	"strings"
)

func GetRequestsLogger(logger *log.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.URL.Path, "socket") {
				logger.Printf("[%v]: %v\n", r.Method, r.URL)
			}
			next.ServeHTTP(w, r)
		})
	}
}
