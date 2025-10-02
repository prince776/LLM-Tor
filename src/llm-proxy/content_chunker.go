package llm_proxy

import (
	"context"
	"encoding/json"
	"github.com/cockroachdb/errors"
)

type ChatGPTContentChunker struct {
	msgs    []Message
	idx     int
	partIdx int
}

type Message struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type Content struct {
	Data        string
	ContentType ContentType
}

type ContentPart struct {
	ContentType ContentType `json:"type"`
	Text        string      `json:"text"`
	ImageURL    struct {
		URL string `json:"url"`
	} `json:"image_url"`
}

type ContentType string

const (
	ContentTypeText     ContentType = "text"
	ContentTypeImageURL ContentType = "image_url"
)

func NewChatGPTContentChunker(src []byte) (*ChatGPTContentChunker, error) {
	msgs := &struct {
		Messages []Message `json:"messages"`
	}{}
	err := json.Unmarshal(src, msgs)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to unmarshal Messages params")
	}
	return &ChatGPTContentChunker{
		msgs: msgs.Messages,
		idx:  0,
	}, nil
}

func (t *ChatGPTContentChunker) HasNext(ctx context.Context) bool {
	if t.idx < len(t.msgs) {
		return true
	}
	return false
}

func (t *ChatGPTContentChunker) Next(ctx context.Context) (*Content, error) {
	m := t.msgs[t.idx]

	if strContent, ok := m.Content.(string); ok {
		t.idx++
		return &Content{
			Data:        strContent,
			ContentType: ContentTypeText,
		}, nil
	}

	contentBytes, err := json.Marshal(m.Content)
	parts := []ContentPart{}
	err = json.Unmarshal(contentBytes, &parts)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to convert content to []ContentPart")
	}

	c := parts[t.partIdx]
	t.partIdx++
	if t.partIdx == len(parts) {
		t.partIdx = 0
		t.idx++
	}
	switch c.ContentType {
	case ContentTypeText:
		return &Content{
			Data:        c.Text,
			ContentType: ContentTypeText,
		}, nil
	case ContentTypeImageURL:
		return &Content{
			Data:        c.ImageURL.URL,
			ContentType: ContentTypeImageURL,
		}, nil
	default:
		return nil, errors.Newf("unsupported content part: %s", c.ContentType)
	}
}
