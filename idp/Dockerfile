# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies for curl (needed for healthcheck)
RUN apk add --no-cache curl

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime stage
FROM alpine:latest

# Install curl for healthcheck
RUN apk --no-cache add curl

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]