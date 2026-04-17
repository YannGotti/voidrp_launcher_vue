import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CORE_HOST = '127.0.0.1'
const CORE_PORT = 38765
const CORE_BASE_URL = `http://${CORE_HOST}:${CORE_PORT}`

type DesktopRequestPayload = {
  method: string
  path: string
  body?: unknown
}

type CoreStatusPayload = {
  running: boolean
  pid: number | null
  baseUrl: string
  executablePath: string
  lastError: string
}

let mainWindow: BrowserWindow | null = null
let coreProcess: ChildProcessWithoutNullStreams | null = null
let coreStartPromise: Promise<void> | null = null
let lastCoreError = ''

function logMain(message: string) {
  console.log(`[VoidRP Main] ${message}`)
}

function emitCoreStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('desktop:core-status', getCoreStatus())
}

function getCoreStatus(): CoreStatusPayload {
  return {
    running: !!coreProcess && coreProcess.exitCode === null,
    pid: coreProcess?.pid ?? null,
    baseUrl: CORE_BASE_URL,
    executablePath: resolveCoreExecutablePath(),
    lastError: lastCoreError
  }
}

function resolveRendererIndexPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'dist-renderer', 'index.html')
  }

  return path.join(process.cwd(), 'dist-renderer', 'index.html')
}

function resolvePreloadPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
  }

  return path.join(__dirname, 'preload.cjs')
}

function resolveCoreExecutablePath(): string {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'core', 'win-x64', 'VoidRpLauncher.CoreHost.exe')
      ]
    : [
        path.join(process.cwd(), 'build', 'core', 'win-x64', 'VoidRpLauncher.CoreHost.exe'),
        path.join(
          process.cwd(),
          'core',
          'VoidRpLauncher.CoreHost',
          'bin',
          'Debug',
          'net8.0',
          'win-x64',
          'VoidRpLauncher.CoreHost.exe'
        ),
        path.join(
          process.cwd(),
          'core',
          'VoidRpLauncher.CoreHost',
          'bin',
          'Release',
          'net8.0',
          'win-x64',
          'VoidRpLauncher.CoreHost.exe'
        )
      ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1180,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: '#050608',
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (app.isPackaged) {
    void mainWindow.loadFile(resolveRendererIndexPath())
  } else {
    void mainWindow.loadURL('http://127.0.0.1:5173')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startCoreProcess() {
  const executablePath = resolveCoreExecutablePath()

  if (!fs.existsSync(executablePath)) {
    throw new Error(`CoreHost exe not found: ${executablePath}`)
  }

  lastCoreError = ''
  logMain(`Starting core: ${executablePath}`)

  coreProcess = spawn(executablePath, [], {
    cwd: path.dirname(executablePath),
    env: {
      ...process.env,
      ASPNETCORE_URLS: CORE_BASE_URL,
      DOTNET_ENVIRONMENT: 'Production',
      ASPNETCORE_ENVIRONMENT: 'Production',
      VOIDRP_LAUNCHER_VERSION: app.getVersion()
    },
    windowsHide: true,
    stdio: 'pipe'
  })

  coreProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString().trim()
    if (!text) return
    logMain(`Core stdout: ${text}`)
  })

  coreProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim()
    if (!text) return
    lastCoreError = text
    logMain(`Core stderr: ${text}`)
    emitCoreStatus()
  })

  coreProcess.on('exit', (code, signal) => {
    logMain(`Core exited. code=${code ?? 'null'} signal=${signal ?? 'null'}`)

    if (code !== 0) {
      lastCoreError = `CoreHost exited with code ${code ?? 'null'}`
    }

    coreProcess = null
    emitCoreStatus()
  })

  coreProcess.on('error', (error) => {
    lastCoreError = error.message
    logMain(`Core spawn error: ${error.message}`)
    emitCoreStatus()
  })

  emitCoreStatus()
}

async function pingCore(): Promise<boolean> {
  try {
    const response = await fetch(`${CORE_BASE_URL}/health`, {
      method: 'GET'
    })

    return response.ok
  } catch {
    return false
  }
}

async function waitForCoreReady(timeoutMs = 20000): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await pingCore()) {
      emitCoreStatus()
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('CoreHost did not become ready in time.')
}

async function ensureCoreRunning(): Promise<void> {
  if (await pingCore()) {
    return
  }

  if (coreStartPromise) {
    return coreStartPromise
  }

  coreStartPromise = (async () => {
    if (!coreProcess || coreProcess.exitCode !== null) {
      startCoreProcess()
    }

    await waitForCoreReady()
  })().finally(() => {
    coreStartPromise = null
  })

  return coreStartPromise
}

async function proxyCoreRequest<T = unknown>(payload: DesktopRequestPayload): Promise<T> {
  await ensureCoreRunning()

  const method = (payload.method || 'GET').toUpperCase()
  const normalizedPath = payload.path.startsWith('/') ? payload.path : `/${payload.path}`

  const response = await fetch(`${CORE_BASE_URL}${normalizedPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: method === 'GET' || method === 'HEAD'
      ? undefined
      : payload.body === undefined
        ? undefined
        : JSON.stringify(payload.body)
  })

  const rawText = await response.text()

  if (!response.ok) {
    throw new Error(rawText || `Core request failed with status ${response.status}`)
  }

  if (!rawText) {
    return null as T
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    return rawText as T
  }
}

function registerIpcHandlers() {
  ipcMain.handle('desktop:request', async (_event, payload: DesktopRequestPayload) => {
    return proxyCoreRequest(payload)
  })

  ipcMain.handle('desktop:get-core-status', async () => {
    try {
      await ensureCoreRunning()
    } catch {
      // статус всё равно вернём, даже если core не поднялся
    }

    return getCoreStatus()
  })

  ipcMain.handle('desktop:open-external', async (_event, url?: string) => {
    if (!url) return false
    await shell.openExternal(url)
    return true
  })

  ipcMain.handle('desktop:open-path', async (_event, targetPath?: string) => {
    if (!targetPath) return ''
    return shell.openPath(targetPath)
  })

  ipcMain.handle('desktop:check-shell-updates', async () => {
    return {
      ok: true,
      message: 'Проверка обновления оболочки пока не подключена в Electron bridge.'
    }
  })

  ipcMain.handle('desktop:download-install-shell-update', async () => {
    return {
      ok: false,
      message: 'Установка обновления оболочки пока не подключена в Electron bridge.'
    }
  })
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  createWindow()

  try {
    await ensureCoreRunning()
  } catch (error) {
    lastCoreError = error instanceof Error ? error.message : String(error)
    emitCoreStatus()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (coreProcess && coreProcess.exitCode === null) {
    try {
      coreProcess.kill()
    } catch {
      // ignore
    }
  }
})