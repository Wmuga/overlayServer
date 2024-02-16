package overlay

type Overlay interface {
	SendViewer(viewer any)
	SendSong(song any)
	SendEventLog(log string)
	SendEventSub(data string)
}
