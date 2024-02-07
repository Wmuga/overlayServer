package eventsub

type EventSub struct {
	Challenge    string            `json:"challenge"`
	Subscription map[string]string `json:"subscription"`
	Event        map[string]string `json:"event"`
}

type EventData struct {
	Nickname string
	Type     string
}

func Convert(s EventSub) EventData {
	d := EventData{}
	d.Type = s.Subscription["type"]
	switch d.Type {
	case "channel.ban":
		d.Nickname = s.Event["user_name"]
	case "channel.unban":
		d.Nickname = s.Event["user_name"]
	case "channel.moderator.add":
		d.Nickname = s.Event["user_name"]
	case "channel.moderator.remove":
		d.Nickname = s.Event["user_name"]
	case "channel.follow":
		d.Nickname = s.Event["user_name"]
	case "channel.raid":
		d.Nickname = s.Event["from_broadcaster_user_name"]
	case "channel.poll.begin":
		d.Nickname = s.Event["broadcaster_user_name"]
	case "channel.poll.end":
		d.Nickname = s.Event["broadcaster_user_name"]
	default:
		d.Nickname = "not_implemented"
	}
	return d
}
