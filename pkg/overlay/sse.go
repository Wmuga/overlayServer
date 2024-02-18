package overlay

import (
	"fmt"
	"log"
	"net/http"
	"sync"
)

type sseEvent struct {
	name string
	data string
}

type sse struct {
	logger *log.Logger
	mu     *sync.RWMutex
	cons   map[int64]chan sseEvent
	lastId int64
}

func NewSSE(logger *log.Logger) (Overlay, http.HandlerFunc) {
	s := &sse{
		logger: logger,
		cons:   make(map[int64]chan sseEvent),
		mu:     &sync.RWMutex{},
	}
	return s, s.getHandler()
}

func (s *sse) SendEventLog(log string) {
	s.logger.Println(log)
}

func (s *sse) SendEventSub(data string) {
	s.addEvent("data", data)
}

func (s *sse) SendSong(song any) {
	s.logger.Println("New music data")
	s.addEvent("music", song.(string))
}

func (s *sse) SendViewer(viewer any) {
	s.logger.Println("New viewer data")
	s.addEvent("viewer", viewer.(string))
}

func (s *sse) addEvent(name, data string) {
	ev := sseEvent{name: name, data: data}
	s.mu.RLock()
	for _, c := range s.cons {
		c <- ev
	}
	s.mu.RUnlock()
}

func (s *sse) getHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")

		id := s.lastId
		s.lastId++
		s.logger.Println("New connection", id)
		// New channel for connection
		c := make(chan sseEvent)
		s.mu.Lock()
		s.cons[id] = c
		s.mu.Unlock()
		// Delete channel after closing connection
		defer func() {
			s.mu.Lock()
			delete(s.cons, id)
			s.mu.Unlock()
		}()

		for {
			select {
			// Connection closed
			case <-r.Context().Done():
				s.logger.Println("Closed connection", id)
				return
			// Write events to connection
			case event := <-c:
				_, err := fmt.Fprintf(w, "event: %s\ndata: %v\n\n", event.name, event.data)
				if err != nil {
					s.logger.Println(err)
					break
				}
				w.(http.Flusher).Flush()
			}
		}
	}
}
