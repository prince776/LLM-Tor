import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../prod-deps/icon.png?asset'
import type { GenerateTokenReq, GenerateTokenResp, LLMProxyReq, LLMProxyResp } from '../types/ipc'

import log from 'electron-log/main'
import { GenerateToken } from './rsa'
import { LLMProxy } from './llmproxy'
import { doTorProxiedRequest, startTorProxy, stopTorProxy, waitForTor } from './torproxy'
import { createServer } from 'http'
import { SERVER_URL } from '../types/config'
// Initialize the logger to be available in renderer process
log.initialize()

let mainWindow: BrowserWindow | null = null
let authWindow: BrowserWindow | null = null
const REDIRECT_PORT = 5139

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      partition: 'persist:app' // ✅ shared partition
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.maximize()
    // mainWindow?.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  mainWindow.webContents.openDevTools({ mode: 'detach' })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  if (mainWindow) {
    mainWindow.webContents.send('tor-setup-begin')
  }
  startTorProxy()
  waitForTor()
    .then(() => {
      // Send an IPC message to the renderer process
      if (mainWindow) {
        mainWindow.webContents.send('tor-ready')
      }
      doTorProxiedRequest('https://check.torproject.org/api/ip').then((result) => {
        result.json().then((result) => {
          log.info('Tor proxy health check:', result)
        })
      })
    })
    .catch((error) => {
      log.error(error)
      process.exit(1)
    })

  ipcMain.handle(
    'generate-token',
    async (_event, requestData: GenerateTokenReq): Promise<GenerateTokenResp> => {
      log.info('[IPC]: Initiated generate-token', requestData)
      try {
        return await GenerateToken(requestData)
      } catch (e) {
        log.info('[IPC]: Errored generate-token:', e)
        return {
          error: e
        }
      }
    }
  )

  ipcMain.handle('llm-proxy', async (_event, requestData: LLMProxyReq): Promise<LLMProxyResp> => {
    log.info('[IPC]: Initiated llm-proxy to', requestData.modelName)
    try {
      return await LLMProxy(requestData)
    } catch (e) {
      log.info('[IPC]: Errored llm-proxy:', e)
      return {
        error: e
      }
    }
  })

  // IPC to start auth from renderer
  ipcMain.handle('start-auth', () => {
    startAuthFlow()
  })

  // IPC to start purchase flow from renderer
  ipcMain.handle(
    'start-purchase',
    (
      _event,
      payload: {
        transientToken: string
        paddlePriceID: string
        userID: string
      }
    ) => {
      startPurchaseFlow(payload)
    }
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopTorProxy()
})

function startAuthFlow(): void {
  const redirectUri = `http://127.0.0.1:${REDIRECT_PORT}/callback`

  // Create local server to capture redirect
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/callback')) {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Sign in successful. You can close this window.</h1>')

      if (authWindow) {
        authWindow.close()
        authWindow = null
      }

      // Reload main window (cookies are already saved in default session)
      if (mainWindow) {
        // HMR for renderer base on electron-vite cli.
        // Load the remote URL for development or the local html file for production.
        if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
          mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        } else {
          mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
        }
        // mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
      }

      server.close()
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(REDIRECT_PORT, () => {
    const signInUrl = `${SERVER_URL}/api/v1/users/signin?redirect=${encodeURIComponent(redirectUri)}`

    // Popup window for OAuth
    authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow ?? undefined,
      // modal: true,
      webPreferences: {
        nodeIntegration: false,
        partition: 'persist:app', // ✅ shared partition
        enableBlinkFeatures: 'CSSBackdropFilter',
        offscreen: false, // make sure it renders normally
        webSecurity: true,
        contextIsolation: true
      }
    })

    authWindow.loadURL(signInUrl)
  })
}

function startPurchaseFlow(payload: {
  transientToken: string
  paddlePriceID: string
  userID: string
}): void {
  const redirectUri = `http://127.0.0.1:${REDIRECT_PORT}/callback`

  // Create local server to capture redirect
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/callback')) {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Purchase flow completed. You can close this window.</h1>')
      server.close()
      if (authWindow) {
        authWindow.close()
        authWindow = null
      }

      // Reload main window (cookies are already saved in default session)
      if (mainWindow) {
        if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
          mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        } else {
          mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
        }
      }
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(REDIRECT_PORT, () => {
    const { transientToken, paddlePriceID, userID } = payload
    const purchaseUrl = `${SERVER_URL}/api/v1/purchase?transientToken=${encodeURIComponent(
      transientToken
    )}&paddlePriceID=${encodeURIComponent(paddlePriceID)}&userID=${encodeURIComponent(
      userID
    )}&redirect=${encodeURIComponent(redirectUri)}`

    // Popup window for purchase
    authWindow = new BrowserWindow({
      width: 700,
      height: 800,
      parent: mainWindow ?? undefined,
      webPreferences: {
        nodeIntegration: false,
        partition: 'persist:app', // ✅ shared partition
        enableBlinkFeatures: 'CSSBackdropFilter',
        offscreen: false,
        webSecurity: true,
        contextIsolation: true
      }
    })

    authWindow.loadURL(purchaseUrl)
  })
}
