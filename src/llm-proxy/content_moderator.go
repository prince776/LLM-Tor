package llm_proxy

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/cockroachdb/errors"
	"llmmask/src/common"
	"llmmask/src/log"
	"llmmask/src/models"
	"net/http"
	"slices"
	"strings"
)

const (
	// NOTE: Changing this text chunking size can affect performance and cost as all the deduplication for text
	// analysis done previously will go to waste.
	textChunkingSizeForAnalysis = 9000
)

// ContentModerator is a client wrapper for the Azure AI Content Safety API.
type ContentModerator struct {
	endpoint  string
	apiKey    string
	client    *http.Client
	dbHandler *models.DBHandler
}

type ContentModerationImage struct {
	Content string `json:"content"`
}

// ContentModerationRequest represents the JSON request body for the text analysis API.
type ContentModerationRequest struct {
	Text  *string                 `json:"text,omitempty"`
	Image *ContentModerationImage `json:"image,omitempty"`
}

// ContentSafetyResponse represents the top-level JSON response from the text analysis API.
type ContentSafetyResponse struct {
	CategoriesAnalysis []CategoryAnalysis `json:"categoriesAnalysis"`
	BlocklistsMatch    []BlocklistMatch   `json:"blocklistsMatch"`
}

// CategoryAnalysis contains the moderation result for a specific harm category.
type CategoryAnalysis struct {
	Category string `json:"category"`
	Severity int    `json:"severity"`
}

// BlocklistMatch contains details if a custom blocklist was matched.
type BlocklistMatch struct {
	BlocklistName string `json:"blocklistName"`
	MatchingText  string `json:"matchingText"`
}

// NewContentModerator creates a new instance of ContentModerator.
func NewContentModerator(endpoint string, apiKey string, dbHandler *models.DBHandler) *ContentModerator {
	return &ContentModerator{
		endpoint:  endpoint,
		apiKey:    apiKey,
		client:    http.DefaultClient,
		dbHandler: dbHandler,
	}
}

func (cm *ContentModerator) AnalyzeGPTReq(ctx context.Context, req []byte) (*ContentSafetyResponse, error) {
	categoriesAnalysis := map[string]CategoryAnalysis{}
	blocklistsMatch := []BlocklistMatch{}

	contentChunker, err := NewChatGPTContentChunker(req)
	if err != nil {
		return nil, err
	}

	for contentChunker.HasNext(ctx) {
		content, err := contentChunker.Next(ctx)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to read content chunk")
		}

		var chunkedContents []*Content
		switch content.ContentType {
		case ContentTypeImageURL:
			chunkedContents = append(chunkedContents, content)
		case ContentTypeText:
			for chunkContent := range slices.Chunk([]byte(content.Data), textChunkingSizeForAnalysis) {
				chunkedContents = append(chunkedContents, &Content{
					Data:        string(chunkContent),
					ContentType: content.ContentType,
				})
			}
		}
		for _, chunk := range chunkedContents {
			currResp, err := cm.analyzeContentWithCaching(ctx, chunk)
			if err != nil {
				return nil, err
			}
			blocklistsMatch = append(blocklistsMatch, currResp.BlocklistsMatch...)
			for _, categoryAnalysis := range currResp.CategoriesAnalysis {
				prevAnalysis, ok := categoriesAnalysis[categoryAnalysis.Category]
				if !ok {
					prevAnalysis = CategoryAnalysis{Severity: 0, Category: categoryAnalysis.Category}
				}
				if categoryAnalysis.Severity > prevAnalysis.Severity {
					prevAnalysis.Severity = categoryAnalysis.Severity
				}
				categoriesAnalysis[categoryAnalysis.Category] = prevAnalysis
			}
		}
	}

	categoriesAnalysisArr := []CategoryAnalysis{}
	for _, categoryAnalysis := range categoriesAnalysis {
		categoriesAnalysisArr = append(categoriesAnalysisArr, categoryAnalysis)
	}

	return &ContentSafetyResponse{
		CategoriesAnalysis: categoriesAnalysisArr,
		BlocklistsMatch:    blocklistsMatch,
	}, nil
}

func (cm *ContentModerator) analyzeContentWithCaching(ctx context.Context, content *Content) (*ContentSafetyResponse, error) {
	md5Hash := md5.Sum([]byte(content.Data))
	textAnalysisID := base64.StdEncoding.EncodeToString(md5Hash[:])
	textAnalysis := &models.TextAnalysis{
		DocID: textAnalysisID,
	}
	err := cm.dbHandler.Fetch(ctx, textAnalysis)
	if err != nil && !models.IsNotFoundErr(err) {
		return nil, err
	}

	if textAnalysis.CachedResponse != nil {
		log.Infof(ctx, "PING: cache hit")
		resp := &ContentSafetyResponse{}
		err = json.Unmarshal(textAnalysis.CachedResponse, resp)
		return resp, err
	}

	resp, err := cm.analyzeContent(ctx, content)
	if err != nil {
		return nil, err
	}
	textAnalysis.CachedResponse = common.Must(json.Marshal(resp))
	return resp, cm.dbHandler.Upsert(ctx, textAnalysis)
}

func (cm *ContentModerator) analyzeContent(ctx context.Context, content *Content) (*ContentSafetyResponse, error) {
	var url string
	requestBody := ContentModerationRequest{}
	switch content.ContentType {
	case ContentTypeText:
		url = fmt.Sprintf("%s/contentsafety/text:analyze?api-version=2024-09-01", cm.endpoint)
		requestBody.Text = &content.Data
	case ContentTypeImageURL:
		url = fmt.Sprintf("%s/contentsafety/image:analyze?api-version=2024-09-01", cm.endpoint)
		imgData := content.Data
		if !strings.HasPrefix(imgData, "data:image/png;base64,") {
			return nil, errors.New("image data should be base64")
		}
		requestBody.Image = &ContentModerationImage{
			Content: strings.TrimPrefix(imgData, "data:image/png;base64,"),
		}
	default:
		return nil, errors.New("unknown content type")
	}
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal request")
	}

	log.Infof(ctx, "PING: Analyzing content: %s, \n at URL %s", string(jsonBody), url)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, errors.Wrapf(err, "failed to create request")
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", cm.apiKey)

	resp, err := cm.client.Do(req)
	if err != nil {
		return nil, errors.Wrapf(err, "API request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&errResp)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to unmarshal response")
		}
		return nil, errors.Newf("API call failed with status %s: %+v", resp.Status, errResp)
	}

	var contentSafetyResp ContentSafetyResponse
	if err := json.NewDecoder(resp.Body).Decode(&contentSafetyResp); err != nil {
		return nil, errors.Wrapf(err, "failed to decode response")
	}

	return &contentSafetyResp, nil
}
