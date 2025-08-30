package models

const (
	TextAnalysisContainer = "text_analysis"
)

type TextAnalysis struct {
	DocID          string `json:"id"` // base64 of the md5 hash of the content.
	PartitionKey   string `json:"PartitionKey"`
	CachedResponse []byte
}

func (u *TextAnalysis) Container() string {
	return TextAnalysisContainer
}

func (u *TextAnalysis) ItemID() string {
	return u.DocID
}

func (u *TextAnalysis) GetPartitionKey() string {
	// TODO: partition key might be useful here.
	u.PartitionKey = DefaultPartitionKey
	return u.PartitionKey
}
