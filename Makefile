.PHONY: build run pull push

build:
	docker build --no-cache -t imap-circuit .

run:
	docker run -it --rm --name imap-circuit imap-circuit
	
pull:
	git pull git@github.com:FalkW/imap-circuit.git
