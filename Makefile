.PHONY: build run pull push

build:
	docker build --no-cache -t circuitdialogflowadapter .

run:
	docker run -it --rm --name circuitdialogflowadapter circuitdialogflowadapter

pull:
	git pull git@github.com:FalkW/circuit-api.ai.git
