package svc

import (
	"encoding/json"
	"github.com/PaddleHQ/paddle-go-sdk"
	"github.com/PaddleHQ/paddle-go-sdk/pkg/paddlenotification"
	"github.com/cockroachdb/errors"
	"github.com/go-chi/render"
	"io"
	"llmmask/src/common"
	"llmmask/src/log"
	"llmmask/src/models"
	"net/http"
)

const (
	customDataUserIDKey = "userID"
)

var subscriptionChangedEvents = []paddlenotification.EventTypeName{
	paddlenotification.EventTypeNameSubscriptionActivated,
	paddlenotification.EventTypeNameSubscriptionCanceled,
	paddlenotification.EventTypeNameSubscriptionCreated,
	paddlenotification.EventTypeNameSubscriptionImported,
	paddlenotification.EventTypeNameSubscriptionPastDue,
	paddlenotification.EventTypeNameSubscriptionPaused,
	paddlenotification.EventTypeNameSubscriptionResumed,
	paddlenotification.EventTypeNameSubscriptionTrialing,
	paddlenotification.EventTypeNameSubscriptionUpdated,
}

func (s *Service) PaddleWebHookHandler(w http.ResponseWriter, r *http.Request) {
	paddleSecretKey := common.PlatformCredsConfig().PaddleCreds.SecretKey
	verifier := paddle.NewWebhookVerifier(paddleSecretKey)
	ok, err := verifier.Verify(r)
	if err != nil {
		render.Render(w, r, ErrInternal(errors.Wrapf(err, "failed to verify signature")))
		return
	}
	if !ok {
		render.Render(w, r, ErrUnauthorized(errors.New("Signature mismatch")))
	}

	ctx := r.Context()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		render.Render(w, r, ErrInternal(err))
		return
	}

	notification := &paddlenotification.GenericNotificationEvent{}
	err = json.Unmarshal(body, notification)
	if err != nil {
		render.Render(w, r, ErrInternal(err))
		return
	}

	if notification.EventType == paddlenotification.EventTypeNameTransactionCompleted {
		transactionCompleted := &paddlenotification.TransactionCompleted{}
		err = json.Unmarshal(body, transactionCompleted)
		if err != nil {
			render.Render(w, r, ErrInternal(err))
			return
		}

		log.Infof(ctx, "Handling transactionCompleted event: %s", string(body))
		transaction := transactionCompleted.Data
		userID := transaction.CustomData[customDataUserIDKey].(string)
		transactionID := transaction.ID
		log.Infof(ctx, "Purchasing user: %s", userID)
		for _, item := range transactionCompleted.Data.Items {
			priceID := item.PriceID
			quantity := item.Quantity

			tokenPackage := s.getPackageForPriceID(priceID)

			modelID := tokenPackage.ModelID
			totalCreditsPurchased := quantity * (tokenPackage.Tokens)
			log.Infof(ctx, "User %s purchased %d credits for model %s", userID, totalCreditsPurchased, modelID)
			user, err := s.getUserFromDocID(ctx, userID)
			if err != nil {
				render.Render(w, r, ErrInternal(err))
				return
			}
			if user.SubscriptionInfo.ActiveAuthTokens == nil {
				user.SubscriptionInfo.ActiveAuthTokens = make(map[string]int)
			}
			user.SubscriptionInfo.ActiveAuthTokens[modelID] += totalCreditsPurchased

			// TODO: Keep consolidating to prevent unending growth.
			user.SubscriptionInfo.PaymentLogs = append(user.SubscriptionInfo.PaymentLogs, models.PaymentLog{
				TransactionID: transactionID,
				TokensGranted: map[string]int{
					modelID: totalCreditsPurchased,
				},
			})

			err = s.dbHandler.Upsert(ctx, user)
			if err != nil {
				render.Render(w, r, ErrInternal(err))
				return
			}
		}
	} else {
		log.Infof(ctx, "Skipping notification: %+v", notification)
	}

	render.Render(w, r, Ok200("ok"))
}
