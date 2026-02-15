import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { GenerateTokenReq, GenerateTokenResp, LLMProxyReq, LLMProxyResp } from '../types/ipc'

// Custom APIs for renderer
const api = {
  generateToken: async (requestData: GenerateTokenReq): Promise<GenerateTokenResp> => {
    // Calls the main process via IPC and returns the result
    return await ipcRenderer.invoke('generate-token', requestData)
  },
  llmProxy: async (requestData: LLMProxyReq): Promise<LLMProxyResp> => {
    return await ipcRenderer.invoke('llm-proxy', requestData)
  },
  startAuth: async (): Promise<void> => {
    return await ipcRenderer.invoke('start-auth')
  },
  startPurchase: async (payload: {
    transientToken: string
    paddlePriceID: string
    userID: string
  }): Promise<void> => {
    return await ipcRenderer.invoke('start-purchase', payload)
  },
  onTorSetupBegin: (callback: () => void) => {
    ipcRenderer.on('tor-setup-begin', callback)
  },
  onTorReady: (callback: () => void) => {
    ipcRenderer.on('tor-ready', callback)
  },
  onAuthWindowClosed: (callback: () => void) => {
    ipcRenderer.on('auth-window-closed', callback)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
