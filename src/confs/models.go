package confs

type ModelName = string

const (
	ModelGemini25FlashLite = "gemini-2.5-flash-lite"
	ModelGemini25Flash     = "gemini-2.5-flash"
	ModelGemini25Pro       = "gemini-2.5-pro"
	ModelGemini3Flash      = "gemini-3-flash-preview"
	ModelGemini3Pro        = "gemini-3-pro-preview"
)

func AllModels() []ModelName {
	return []ModelName{
		ModelGemini25FlashLite,
		ModelGemini25Flash,
		ModelGemini25Pro,
		ModelGemini3Flash,
		ModelGemini3Pro,
	}
}
