all: win linux

win:
	sudo docker run --rm -it -v ./:/go/work \
    -w /go/work \
    x1unix/go-mingw go build -buildvcs=false .
	rm ./bin/server.exe || echo 1 > /dev/null
	mv server.exe ./bin/server.exe

linux:
	CGO_ENABLED=1 go build -o bin/main main.go