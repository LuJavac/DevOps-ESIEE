.PHONY: help install dev test db-start db-stop db-init db-import db-stats \
	docker-build docker-build-backend docker-build-frontend docker-run-backend \
	compose-up compose-import compose-down compose-reset \
	k8s-build k8s-build-backend k8s-build-frontend k8s-deploy k8s-import k8s-delete \
	k8s-status k8s-logs-backend k8s-logs-frontend k8s-url k8s-validate clean

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

install: ## Install backend dependencies
	cd backend && npm ci

dev: ## Run backend in dev mode
	cd backend && npm run dev

test: ## Run backend tests
	cd backend && npm test

db-start: ## Start local PostgreSQL with Docker
	docker run -d \
		--name equipements-db \
		-e POSTGRES_PASSWORD=devops2026 \
		-e POSTGRES_DB=equipements \
		-p 5432:5432 \
		postgres:15-alpine

db-stop: ## Stop local PostgreSQL container
	docker stop equipements-db || true
	docker rm equipements-db || true

db-init: ## Initialize DB schema without remote import
	cd backend && npm run db:init-schema

db-import: ## Import public data into PostgreSQL
	cd backend && node src/scripts/import-data.js

db-stats: ## Show total rows in local DB container
	docker exec equipements-db psql -U postgres -d equipements -c "SELECT COUNT(*) AS total FROM equipements;"

docker-build-backend: ## Build backend image
	cd backend && docker build -t equipements-api:latest .

docker-build-frontend: ## Build frontend image
	cd frontend && docker build -t equipements-frontend:latest .

docker-build: docker-build-backend docker-build-frontend ## Build both images

docker-run-backend: ## Run backend image (requires DB reachable)
	docker run --rm -p 3000:3000 \
		-e DB_HOST=host.docker.internal \
		-e DB_PORT=5432 \
		-e DB_NAME=equipements \
		-e DB_USER=postgres \
		-e DB_PASSWORD=devops2026 \
		equipements-api:latest

compose-up: ## Start local stack with Docker Compose
	docker compose up -d --build postgres-service backend-service frontend-service

compose-import: ## Import public data into Compose PostgreSQL
	docker compose run --rm data-import-job

compose-down: ## Stop local Compose stack
	docker compose down

compose-reset: ## Stop stack and delete Compose volume
	docker compose down -v

k8s-build-backend: ## Build backend image inside Minikube Docker
	eval $$(minikube docker-env) && cd backend && docker build -t equipements-api:latest .

k8s-build-frontend: ## Build frontend image inside Minikube Docker
	eval $$(minikube docker-env) && cd frontend && docker build -t equipements-frontend:latest .

k8s-build: k8s-build-backend k8s-build-frontend ## Build all images for Minikube

k8s-deploy: ## Deploy PostgreSQL + backend + frontend
	kubectl apply -f kubernetes/postgres.yaml
	kubectl apply -f kubernetes/deployment.yaml
	kubectl apply -f kubernetes/frontend.yaml

k8s-import: ## Run import job on Kubernetes
	kubectl apply -f kubernetes/data-import-job.yaml

k8s-delete: ## Delete all Kubernetes resources
	kubectl delete -f kubernetes/frontend.yaml --ignore-not-found
	kubectl delete -f kubernetes/deployment.yaml --ignore-not-found
	kubectl delete -f kubernetes/data-import-job.yaml --ignore-not-found
	kubectl delete -f kubernetes/postgres.yaml --ignore-not-found

k8s-status: ## Show pods, services and jobs
	@echo "=== Pods ==="
	kubectl get pods
	@echo ""
	@echo "=== Services ==="
	kubectl get services
	@echo ""
	@echo "=== Jobs ==="
	kubectl get jobs

k8s-logs-backend: ## Tail backend logs
	kubectl logs -l app=backend --tail=100 -f

k8s-logs-frontend: ## Tail frontend logs
	kubectl logs -l app=frontend --tail=100 -f

k8s-url: ## Get frontend URL from Minikube
	@minikube service frontend-service --url

k8s-validate: ## Validate Kubernetes deployment
	./validate-k8s.sh

clean: ## Remove backend dependencies and test artifacts
	cd backend && rm -rf node_modules coverage
