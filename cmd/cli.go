package main

import (
	"log"
	"time"

	"github.com/a0dotrun/expose"
)

func main() {
	if err := expose.ProxyServeStdio("http://localhost:3000", 10*time.Second); err != nil {
		log.Fatalf("Failed to start proxy server: %v", err)
	}
}
