package expose

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
	headers    map[string]string
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

func (c *Client) SetHeader(key, value string) {
	c.headers[key] = value
}

func (c *Client) MakePostRequest(
	ctx context.Context,
	endpoint string,
	body interface{},
) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, endpoint)
	var requestBody []byte
	var err error
	if body != nil {
		requestBody, err = json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	for key, value := range c.headers {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return responseBody, nil
}

func createErrorResponse(
	id interface{},
	code int,
	message string,
) mcp.JSONRPCMessage {
	return mcp.JSONRPCError{
		JSONRPC: mcp.JSONRPC_VERSION,
		ID:      id,
		Error: struct {
			Code    int         `json:"code"`
			Message string      `json:"message"`
			Data    interface{} `json:"data,omitempty"`
		}{
			Code:    code,
			Message: message,
		},
	}
}

func createResponse(id interface{}, result interface{}) mcp.JSONRPCMessage {
	return mcp.JSONRPCResponse{
		JSONRPC: mcp.JSONRPC_VERSION,
		ID:      id,
		Result:  result,
	}
}

type ProxyStdioServer struct {
	BaseURL   string
	Client    *Client
	errLogger *log.Logger
}

func NewProxyStdioServer(baseURL string, timeout time.Duration) *ProxyStdioServer {
	return &ProxyStdioServer{
		BaseURL:   baseURL,
		Client:    NewClient(baseURL, timeout),
		errLogger: log.New(os.Stderr, "", log.LstdFlags),
	}
}

func (s *ProxyStdioServer) SetBaseURL(baseURL string) {
	s.BaseURL = baseURL
}

func (s *ProxyStdioServer) SetErrLogger(errLogger *log.Logger) {
	s.errLogger = errLogger
}

func (s *ProxyStdioServer) Listen(
	ctx context.Context,
	stdin io.Reader,
	stdout io.Writer,
) error {

	reader := bufio.NewReader(stdin)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Use a goroutine to make the read cancellable
			readChan := make(chan string, 1)
			errChan := make(chan error, 1)

			go func() {
				line, err := reader.ReadString('\n')
				if err != nil {
					errChan <- err
					return
				}
				readChan <- line
			}()

			select {
			case <-ctx.Done():
				return ctx.Err()
			case err := <-errChan:
				if err == io.EOF {
					return nil
				}
				s.errLogger.Printf("Error reading input: %v", err)
				return err
			case line := <-readChan:
				if err := s.proxyMessage(ctx, line, stdout); err != nil {
					if err == io.EOF {
						return nil
					}
					s.errLogger.Printf("Error handling message: %v", err)
					return err
				}
			}
		}
	}
}

func (s *ProxyStdioServer) handleMessage(
	ctx context.Context,
	message json.RawMessage,
) mcp.JSONRPCMessage {
	var baseMessage struct {
		JSONRPC string      `json:"jsonrpc"`
		Method  string      `json:"method"`
		ID      interface{} `json:"id,omitempty"`
	}

	if err := json.Unmarshal(message, &baseMessage); err != nil {
		return createErrorResponse(nil, mcp.PARSE_ERROR, "Failed to parse message")
	}

	// Check for valid JSONRPC version
	if baseMessage.JSONRPC != mcp.JSONRPC_VERSION {
		return createErrorResponse(
			baseMessage.ID,
			mcp.INVALID_REQUEST,
			"Invalid JSON-RPC version",
		)
	}

	if baseMessage.ID == nil {
		return nil
	}

	if baseMessage.Method == "ping" {
		var request mcp.PingRequest
		if err := json.Unmarshal(message, &request); err != nil {
			return createErrorResponse(
				baseMessage.ID,
				mcp.INVALID_REQUEST,
				"Invalid ping request",
			)
		}
		return createResponse(baseMessage.ID, mcp.EmptyResult{})
	}

	switch baseMessage.Method {
	case "initialize", "tools/list", "tools/call":
		response, err := s.Client.MakePostRequest(ctx, "/", message)
		if err != nil {
			return createErrorResponse(
				baseMessage.ID,
				mcp.INTERNAL_ERROR,
				"Failed to make request",
			)
		}
		var responseMessage mcp.JSONRPCMessage
		if err := json.Unmarshal(response, &responseMessage); err != nil {
			return createErrorResponse(
				baseMessage.ID,
				mcp.INTERNAL_ERROR,
				"Failed to parse response",
			)
		}
		return responseMessage
	default:
		return createErrorResponse(
			baseMessage.ID,
			mcp.METHOD_NOT_FOUND,
			fmt.Sprintf("Method %s not supported", baseMessage.Method),
		)
	}
}

func (s *ProxyStdioServer) proxyMessage(
	ctx context.Context,
	line string,
	writer io.Writer,
) error {
	var rawMessage json.RawMessage
	if err := json.Unmarshal([]byte(line), &rawMessage); err != nil {
		response := createErrorResponse(nil, mcp.PARSE_ERROR, "Parse error")
		return s.writeResponse(response, writer)
	}

	response := s.handleMessage(ctx, rawMessage)
	if response != nil {
		return s.writeResponse(response, writer)
	}
	return nil
}

// writeResponse marshals and writes a JSON-RPC response message followed by a newline.
// Returns an error if marshaling or writing fails.
func (s *ProxyStdioServer) writeResponse(
	response mcp.JSONRPCMessage,
	writer io.Writer,
) error {
	responseBytes, err := json.Marshal(response)
	if err != nil {
		return err
	}

	// Write response followed by newline
	if _, err := fmt.Fprintf(writer, "%s\n", responseBytes); err != nil {
		return err
	}

	return nil
}

func ProxyServeStdio(baseURL string, timeout time.Duration) error {
	ps := NewProxyStdioServer(baseURL, timeout)
	ps.SetErrLogger(log.New(os.Stderr, "", log.LstdFlags))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-sigChan
		cancel()
	}()

	return ps.Listen(ctx, os.Stdin, os.Stdout)
}
