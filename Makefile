all: win linux

win:
	sudo docker run --rm -it -v ./:/go/work \
    -w /go/work \
    x1unix/go-mingw go build -buildvcs=false .

linux:
	CGO_ENABLED=1 go build -o bin/main main.go