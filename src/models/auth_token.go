package models

import (
	"crypto/sha256"
	"encoding/base64"
	"time"
)

const DefaultPartitionKey = "primary"

const (
	AuthTokenContainer = "auth_tokens"
)

type AuthToken struct {
	DocID          string `json:"id"` // base64 of the token.
	PartitionKey   string `json:"PartitionKey"`
	ModelName      string
	CreatedAt      time.Time
	ExpiresAt      time.Time // TODO: Have a job that clears RequestHash and CachedResponse for already expired tokens. Maybe even move them to separate collection.
	RequestHash    []byte
	CachedResponse []byte // To not screw over customers over flaky network, wrapped with DEKWrapped
	DEKWrapped     []byte
	DEKKMSKeyID    string
}

func (u *AuthToken) Container() string {
	return AuthTokenContainer
}

func (u *AuthToken) ItemID() string {
	return u.DocID
}

func (u *AuthToken) GetPartitionKey() string {
	// TODO: partition key might be useful here.
	u.PartitionKey = DefaultPartitionKey
	return u.PartitionKey
}

func DocIDForAuthToken(token []byte) string {
	hash := sha256.Sum256(token)
	return base64.StdEncoding.EncodeToString(hash[:])
}
