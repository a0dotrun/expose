package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/a0dotrun/expose"
	"github.com/spf13/cobra"
)

func main() {
	var url string
	var timeout int

	rootCmd := &cobra.Command{
		Use:   "expose-cli",
		Short: "A CLI tool for proxying MCP tools",
		Long:  `expose-cli is a command-line tool that proxies MCP tools to a specified URL with configurations`,
		Run: func(cmd *cobra.Command, args []string) {
			if url == "" {
				fmt.Println("Error: URL is required")
				cmd.Help()
				os.Exit(1)
			}

			timeoutDuration := time.Duration(timeout) * time.Second
			if err := expose.ProxyServeStdio(url, timeoutDuration); err != nil {
				log.Fatalf("Failed to start proxy server: %v", err)
			}
		},
	}

	// Define flags
	rootCmd.Flags().StringVar(&url, "url", "", "Target URL to proxy (required)")
	rootCmd.Flags().IntVar(&timeout, "timeout", 10, "Connection timeout in seconds")

	// Execute
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
