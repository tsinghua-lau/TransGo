import * as vscode from 'vscode'

/**
 * 配置管理器，负责处理所有与VS Code settings.json相关的配置操作
 */
export class ConfigManager {
  private static readonly SECTION = 'transgo'

  /**
   * 获取当前翻译服务提供商
   */
  static getProvider(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('provider', 'google')
  }

  /**
   * 设置翻译服务提供商
   */
  static async setProvider(provider: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('provider', provider, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取百度翻译配置
   */
  static getBaiduConfig(): { appid: string; appkey: string } {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return {
      appid: config.get('baidu.appid', ''),
      appkey: config.get('baidu.appkey', ''),
    }
  }

  /**
   * 设置百度翻译配置
   */
  static async setBaiduConfig(appid: string, appkey: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('baidu.appid', appid, vscode.ConfigurationTarget.Global)
    await config.update('baidu.appkey', appkey, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取有道翻译配置
   */
  static getYoudaoConfig(): { appKey: string; appSecret: string } {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return {
      appKey: config.get('youdao.appkey', ''),
      appSecret: config.get('youdao.appsecret', ''),
    }
  }

  /**
   * 设置有道翻译配置
   */
  static async setYoudaoConfig(appKey: string, appSecret: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('youdao.appkey', appKey, vscode.ConfigurationTarget.Global)
    await config.update('youdao.appsecret', appSecret, vscode.ConfigurationTarget.Global)
  }

  /**
   * 检查当前配置是否完整
   */
  static isConfigured(): boolean {
    const provider = this.getProvider()

    switch (provider) {
      case 'baidu':
        const baiduConfig = this.getBaiduConfig()
        return baiduConfig.appid.length > 0 && baiduConfig.appkey.length > 0
      case 'youdao':
        const youdaoConfig = this.getYoudaoConfig()
        return youdaoConfig.appKey.length > 0 && youdaoConfig.appSecret.length > 0
      case 'google':
      default:
        return true // Google翻译不需要配置
    }
  }

  /**
   * 清除所有配置
   */
  static async clearAllConfig(): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('provider', 'google', vscode.ConfigurationTarget.Global)
    await config.update('baidu.appid', '', vscode.ConfigurationTarget.Global)
    await config.update('baidu.appkey', '', vscode.ConfigurationTarget.Global)
    await config.update('youdao.appkey', '', vscode.ConfigurationTarget.Global)
    await config.update('youdao.appsecret', '', vscode.ConfigurationTarget.Global)
  }

  /**
   * 监听配置变化
   */
  static onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(this.SECTION)) {
        callback(e)
      }
    })
  }
}
