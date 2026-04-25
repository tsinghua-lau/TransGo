import * as vscode from 'vscode'

let _isDev = false

/**
 * 由 extension.ts activate() 调用，传入 extensionMode 初始化日志开关。
 * Production 模式下所有日志静默，Development/Test 模式正常输出。
 */
export function initLogger(mode: vscode.ExtensionMode): void {
  _isDev = mode !== vscode.ExtensionMode.Production
}

export const logger = {
  log: (...args: any[]) => {
    if (_isDev) console.log(...args)
  },
  warn: (...args: any[]) => {
    if (_isDev) console.warn(...args)
  },
  error: (...args: any[]) => {
    if (_isDev) console.error(...args)
  },
}
