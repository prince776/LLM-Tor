import { LLMModel } from '../types'
import { MODEL_IDS } from '../../../types/models'

export const availableModels: LLMModel[] = [
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
  }
]
