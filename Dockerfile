# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
# Copy everything except desktop-client directory
COPY . .
RUN rm -rf desktop-client
RUN go build -o llmmask src/main.go

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/llmmask ./llmmask
#COPY --from=builder /app/resources ./resources
EXPOSE 8080
CMD ["./llmmask"]
