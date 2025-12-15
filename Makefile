# Time-Locked Vault - Development Commands
# Usage: make [command]

.PHONY: dev stop restart status build start lint clean help

# Default port
PORT ?= 3000

## Development

dev: ## Start development server
	@npm run dev

dev-turbo: ## Start dev server with Turbopack
	@npm run dev:turbo

stop: ## Stop dev server on port 3000
	@lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || echo "No server running on port $(PORT)"

restart: stop dev ## Restart dev server

status: ## Check if dev server is running
	@lsof -i:$(PORT) 2>/dev/null && echo "✓ Server running on port $(PORT)" || echo "✗ No server on port $(PORT)"

## Production

build: ## Build for production
	@npm run build

start: ## Start production server
	@npm run start

## Quality

lint: ## Run ESLint
	@npm run lint

lint-fix: ## Run ESLint with auto-fix
	@npm run lint -- --fix

## Utilities

clean: ## Clean build artifacts and node_modules
	@rm -rf .next node_modules
	@echo "Cleaned .next and node_modules"

install: ## Install dependencies
	@npm install

logs: ## Show recent terminal output (requires dev server running in background)
	@tail -50 ~/.cursor/projects/*/terminals/*.txt 2>/dev/null | head -100 || echo "No terminal logs found"

## Help

help: ## Show this help
	@echo "Time-Locked Vault - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make dev        # Start dev server"
	@echo "  make restart    # Restart dev server"
	@echo "  make status     # Check if server is running"
	@echo "  make PORT=3001 stop  # Stop server on custom port"

# Default target
.DEFAULT_GOAL := help

