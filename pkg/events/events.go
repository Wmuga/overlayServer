package events

import (
	"database/sql"
	"server/pkg/eventsub"

	_ "github.com/mattn/go-sqlite3"
)

type DBEventLogic struct {
	db *sql.DB
}

const (
	sqlCheckFollower = "SELECT id FROM events WHERE nickname = ?;"
	sqlAddEvent      = "INSERT INTO events(event_type, nickname) VALUES (?,?);"
	sqlGet10Events   = "SELECT event_type, nickaname FROM events ORDER BY id DESC LIMIT 10;"
)

func NewEventLogic() *DBEventLogic {
	db, err := sql.Open("sqlite3", "streamDB.db")
	if err != nil {
		panic(err)
	}
	err = db.Ping()
	if err != nil {
		panic(err)
	}

	return &DBEventLogic{
		db: db,
	}
}

func (l *DBEventLogic) AddEvent(event eventsub.EventData) error {
	if event.Type == "channel.follow" && l.checkFollowExists(event) {
		return nil
	}
	_, err := l.db.Exec(sqlAddEvent, event.Type, event.Nickname)
	return err
}

func (l *DBEventLogic) GetLast() ([]eventsub.EventData, error) {
	rows, err := l.db.Query(sqlGet10Events)
	if err != nil {
		return nil, err
	}
	events := make([]eventsub.EventData, 10)
	i := 0
	for rows.Next() && i < 10 {
		event := eventsub.EventData{}
		rows.Scan(&event.Type, &event.Nickname)
		events[i] = event
		i++
	}
	return events, nil
}

func (l *DBEventLogic) checkFollowExists(event eventsub.EventData) bool {
	if l.db.QueryRow(sqlCheckFollower, event.Nickname).Scan() != nil {
		return false
	}
	return true
}
