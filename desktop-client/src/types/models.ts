// Centralized model configuration to avoid duplication
// This file is shared between main and renderer processes

export const MODEL_IDS = {
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_PRO: 'gemini-2.5-pro'
} as const

export const AVAILABLE_MODEL_IDS = [MODEL_IDS.GEMINI_2_5_FLASH, MODEL_IDS.GEMINI_2_5_PRO] as const

export type ModelId = (typeof AVAILABLE_MODEL_IDS)[number]
