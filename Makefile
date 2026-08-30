# Common project commands. Run from repo root: `make <target>`
# Requires: uv (pipeline/), Node 22+ (site/)

.PHONY: help serve install test data validate process package build preview deliver

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

serve: ## Start the site (Astro dev server)
	cd site && npm run dev

install: ## Install pipeline + site dependencies
	cd pipeline && uv sync --all-groups
	cd site && npm install

test: ## Run pipeline and site tests
	cd pipeline && uv run pytest
	cd site && npm test

validate: ## Validate raw episodes
	cd pipeline && uv run evtop20 validate

process: ## Build processed stats from raw
	cd pipeline && uv run evtop20 process

package: ## Build packaged UI JSON from processed
	cd pipeline && uv run evtop20 package

data: validate process package ## validate → process → package

deliver: ## Copy packaged data into site/public (predev/prebuild also do this)
	cd site && node scripts/deliver-packaged.mjs

build: ## Production site build → site/dist/
	cd site && npm run build

preview: ## Preview the production build
	cd site && npm run preview
