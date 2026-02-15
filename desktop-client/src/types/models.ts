// Centralized model configuration to avoid duplication
// This file is shared between main and renderer processes

export const MODEL_IDS = {
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  GEMINI_3_PRO: 'gemini-3-pro-preview'
} as const

export const AVAILABLE_MODEL_IDS = [
  MODEL_IDS.GEMINI_2_5_FLASH,
  MODEL_IDS.GEMINI_2_5_PRO,
  MODEL_IDS.GEMINI_2_5_FLASH_LITE,
  MODEL_IDS.GEMINI_3_FLASH,
  MODEL_IDS.GEMINI_3_PRO
] as const

export type ModelId = (typeof AVAILABLE_MODEL_IDS)[number]
