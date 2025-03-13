.PHONY: format publish

format:
	@echo "Formatting code..."
	./scripts/format

publish:
	@echo "Publishing package..."
	./scripts/publish
