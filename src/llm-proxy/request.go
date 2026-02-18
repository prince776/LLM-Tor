package llm_proxy

import (
	"encoding/json"
	"llmmask/src/common"
	"llmmask/src/confs"
	"log"
	"net/http"
)

type LLMProxyExtraBodyReq struct {
	Token       []byte
	SignedToken []byte
	ModelName   string
}

func DestURLForModel(modelName confs.ModelName) string {
	switch modelName {
	case confs.ModelGemini25Flash, confs.ModelGemini25Pro, confs.ModelGemini25FlashLite, confs.ModelGemini3Flash, confs.ModelGemini3Pro:
		return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
	case confs.ModelChatGPT41Mini, confs.ModelChatGPT41, confs.ModelChatGPT4o, confs.ModelChatGPTo1:
		return "https://llmtoropenai.openai.azure.com/openai/v1/chat/completions"
	default:
		log.Panicf("unknown model name: %s", modelName)
		panic("unreachable")
	}
}

func (b *LLMProxyExtraBodyReq) Sanitize() error {
	// TODO: Sanitize Errors.
	return nil
}

func (b *LLMProxyExtraBodyReq) Bytes() []byte {
	if b == nil {
		return []byte{}
	}
	res, err := json.Marshal(b)
	common.Assert(err == nil, "failed to marshal request body")
	return res
}

func (b *LLMProxyExtraBodyReq) Bind(r *http.Request) error {
	return nil
}
