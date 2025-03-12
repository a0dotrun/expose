.PHONY: format release

format:
	@echo "Formatting code..."
	./scripts/format

release:
	@echo "Releasing package..."
	./scripts/release
