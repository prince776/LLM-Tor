import { LLMModel } from '../types'
import { MODEL_IDS } from '../../../types/models'

export const availableModels: LLMModel[] = [
  {
    id: MODEL_IDS.GEMINI_2_5_FLASH_LITE,
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    description: 'Ultra Fast'
  },
  {
    id: MODEL_IDS.GEMINI_2_5_FLASH,
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Fast all around help'
  },
  {
    id: MODEL_IDS.GEMINI_2_5_PRO,
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Reasoning, math & code'
  },
  {
    id: MODEL_IDS.GEMINI_3_FLASH,
    name: 'Gemini 3 Flash',
    provider: 'Google',
    description: 'Balanced model built for speed, scale, and frontier intelligence'
  },
  {
    id: MODEL_IDS.GEMINI_3_PRO,
    name: 'Gemini 3 Pro',
    provider: 'Google',
    description: "Google's MOST INTELLIGENT MODEL"
  }
]
