package svc

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"llmmask/src/common"
	"llmmask/src/models"
	"net/http"
	"time"

	"github.com/go-chi/render"
)

func (s *Service) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := s.getUserFromContext(ctx)
	user.TransientToken = s.getTransientUserToken(user.DocID)
	render.Render(w, r, Ok200(user))
}

func (s *Service) getUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(userContextKey).(*models.User)
	common.Assert(ok, "user not in context")
	return user
}

func (s *Service) getTransientUserToken(userID string) string {
	transientTokenCacheKey := transientUserTokenCacheKey(userID)
	tokenI, found := s.inMemCache.Get(transientTokenCacheKey)
	if found {
		return tokenI.(string)
	}
	token := uuid.New().String()
	s.inMemCache.Set(transientTokenCacheKey, token, time.Minute*5)
	return token
}

func (s *Service) clearTransientUserToken(userID string) {
	transientTokenCacheKey := transientUserTokenCacheKey(userID)
	s.inMemCache.Delete(transientTokenCacheKey)
}

func transientUserTokenCacheKey(userID string) string {
	return fmt.Sprintf("transient-token-%s", userID)
}
