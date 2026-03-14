.PHONY: help install build up down logs test test-cov

help:
	@echo "NovaTutor AI Makefile"
	@echo "  install    Install dependencies locally"
	@echo "  build      Build docker containers"
	@echo "  up         Start the services"
	@echo "  down       Stop the services"
	@echo "  logs       View logs"
	@echo "  test       Run tests (fast, no coverage)"
	@echo "  test-cov   Run tests + coverage gate >=80% for learning.py"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

test:
	cd backend && pytest

test-cov:
	cd backend && pytest \
		--cov=app/presentation/api/v1/learning \
		--cov-report=term-missing \
		--cov-fail-under=80 \
		-v

