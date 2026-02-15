package svc

import (
	"fmt"
	"github.com/go-chi/render"
	"html/template"
	"llmmask/src/common"
	"llmmask/src/log"
	"net/http"
)

type GetModelPricingResp struct {
	Packages []common.ModelTokenPackage
}

func (s *Service) GetModelPricingHandler(w http.ResponseWriter, r *http.Request) {
	packages := common.DeepCopyJSONMust(common.PlatformCredsConfig().ModelPackages)
	packages = common.Map(packages, func(p common.ModelTokenPackage) common.ModelTokenPackage {
		p.ID = p.ModelID + p.Price
		return p
	})
	render.Respond(w, r, Ok200(&GetModelPricingResp{
		Packages: packages,
	}))
}

func (s *Service) getPackageForPriceID(priceID string) *common.ModelTokenPackage {
	for _, pkg := range common.PlatformCredsConfig().ModelPackages {
		if pkg.PaddlePriceID == priceID {
			return &pkg
		}
	}
	return nil
}

func (s *Service) PurchaseHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := r.URL.Query().Get("userID")
	transientToken := r.URL.Query().Get("transientToken")
	priceID := r.URL.Query().Get("paddlePriceID")
	redirectURL := r.URL.Query().Get("redirectURL")

	tokenPackage := s.getPackageForPriceID(priceID)
	if tokenPackage == nil {
		render.Respond(w, r, ErrNotFound)
		return
	}

	log.Infof(ctx, "Executing payments: %s, %s, %s", userID, priceID, transientToken)
	user, err := s.getUserFromDocID(ctx, userID)
	if err != nil {
		render.Render(w, r, ErrInternal(err))
		return
	}

	paddleClientToken := common.PlatformCredsConfig().PaddleCreds.ClientToken
	paddleEnv := common.PlatformCredsConfig().PaddleCreds.Environment
	data := struct {
		PaddleToken string
		PriceID     string
		Email       string
		Environment string
		UserID      string
		RedirectURL string
		NumTokens   string
		ModelName   string
		Price       string
	}{
		PaddleToken: paddleClientToken,
		PriceID:     priceID,
		Email:       user.Email,
		Environment: paddleEnv,
		UserID:      userID,
		RedirectURL: redirectURL,
		NumTokens:   fmt.Sprintf("%v", tokenPackage.Tokens),
		Price:       tokenPackage.Price,
		ModelName:   tokenPackage.ModelID,
	}

	// Note: In production, parse templates ONCE at startup, not inside the handler.
	tmpl := template.New("checkoutTmpl")
	tmpl, err = tmpl.Parse(checkoutTemplate)
	if err != nil {
		render.Render(w, r, ErrInternal(err))
		return
	}

	w.Header().Set("Content-Type", "text/html")
	tmpl.Execute(w, data)
	return
}

const checkoutTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Purchase</title>
    <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f7f9;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        h1 { font-size: 1.5rem; color: #1a1f36; margin-bottom: 0.5rem; }
        p { color: #4f566b; margin-bottom: 2rem; line-height: 1.5; }
        
        .btn {
            background-color: #000; /* Or your brand color */
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.1s ease, background-color 0.2s ease;
            width: 100%;
        }
        .btn:hover { background-color: #2a2a2a; }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { background-color: #a5acb8; cursor: not-allowed; }
    </style>
</head>
<body>

    <div class="card">
        <h1>Ready to Purchase?</h1>
        <p>Click below to open the secure payment gateway and complete your subscription.</p>
		<p>Purchase {{.NumTokens}} Credits For Model: {{.ModelName}} </p>
        
        <button id="checkout-btn" class="btn">Pay {{.Price}} </button>
    </div>

    <script type="text/javascript">
        // Initialize Paddle
		Paddle.Environment.set("{{.Environment}}");
        Paddle.Initialize({ 
            token: "{{.PaddleToken}}",
			eventCallback: function(data) {
				if (data.name === "checkout.completed") {
					console.log("CHECKOUT COMPLETE");
					//setTimeout(() => {  window.location.replace = "{{.RedirectURL}}"; }, 3000)
					window.location.replace("{{.RedirectURL}}");
				}
				if (data.name === "checkout.closed") {
					// Re-enable button if they close the overlay
					checkoutBtn.disabled = false;
					checkoutBtn.innerText = "Proceed to Payment";
				}
			}
        });

        const checkoutBtn = document.getElementById('checkout-btn');

        checkoutBtn.addEventListener('click', function() {
            // Disable button to prevent double-clicks
            checkoutBtn.disabled = true;
            checkoutBtn.innerText = "Opening...";

            Paddle.Checkout.open({
                settings: {
                    displayMode: "overlay",
                    theme: "light",
                    locale: "en"
                },
                items: [{
                    priceId: "{{.PriceID}}",
                    quantity: 1
                }],
                customer: {
                    email: "{{.Email}}"
                },
				customData: {
					userID: "{{.UserID}}"
				},
            });
        });
    </script>
</body>
</html>`
