import * as vscode from 'vscode'

export interface AITranslationConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelName: string
  prompt: string
  vendor: string
}

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
   * 获取腾讯翻译配置
   */
  static getTencentConfig(): { secretId: string; secretKey: string } {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return {
      secretId: config.get('tencent.secretid', ''),
      secretKey: config.get('tencent.secretkey', ''),
    }
  }

  /**
   * 设置腾讯翻译配置
   */
  static async setTencentConfig(secretId: string, secretKey: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('tencent.secretid', secretId, vscode.ConfigurationTarget.Global)
    await config.update('tencent.secretkey', secretKey, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取AI翻译配置列表
   */
  static getAIConfigs(): AITranslationConfig[] {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('ai.configs', [])
  }

  /**
   * 设置AI翻译配置列表
   */
  static async setAIConfigs(configs: AITranslationConfig[]): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('ai.configs', configs, vscode.ConfigurationTarget.Global)
  }

  /**
   * 添加AI翻译配置
   */
  static async addAIConfig(newConfig: AITranslationConfig): Promise<void> {
    const configs = this.getAIConfigs()
    const existingIndex = configs.findIndex(c => c.id === newConfig.id)
    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig
    } else {
      configs.push(newConfig)
    }
    await this.setAIConfigs(configs)
  }

  /**
   * 删除AI翻译配置
   */
  static async removeAIConfig(configId: string): Promise<void> {
    console.log('ConfigManager: 开始删除AI配置，ID:', configId)
    const configs = this.getAIConfigs()
    console.log('删除前的配置列表:', configs)
    
    const filteredConfigs = configs.filter(c => c.id !== configId)
    console.log('过滤后的配置列表:', filteredConfigs)
    
    await this.setAIConfigs(filteredConfigs)
    console.log('配置已保存到VSCode设置')
    
    // 如果删除的是当前选中的配置，需要更新选中状态
    const currentConfigId = this.getCurrentAIConfigId()
    console.log('当前选中的配置ID:', currentConfigId)
    
    if (currentConfigId === configId) {
      console.log('删除的是当前选中的配置，需要更新选中状态')
      if (filteredConfigs.length > 0) {
        // 选择第一个剩余的配置
        console.log('选择第一个剩余配置:', filteredConfigs[0].id)
        await this.setCurrentAIConfigId(filteredConfigs[0].id)
      } else {
        // 没有配置了，清空选择
        console.log('没有配置了，清空选择')
        await this.setCurrentAIConfigId('')
      }
    }
    console.log('删除AI配置完成')
  }

  /**
   * 获取当前选中的AI翻译配置ID
   */
  static getCurrentAIConfigId(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('ai.currentConfigId', '')
  }

  /**
   * 设置当前选中的AI翻译配置ID
   */
  static async setCurrentAIConfigId(configId: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('ai.currentConfigId', configId, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取当前AI翻译配置
   */
  static getCurrentAIConfig(): AITranslationConfig | null {
    const configs = this.getAIConfigs()
    const currentId = this.getCurrentAIConfigId()
    return configs.find(c => c.id === currentId) || null
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
      case 'tencent':
        const tencentConfig = this.getTencentConfig()
        return tencentConfig.secretId.length > 0 && tencentConfig.secretKey.length > 0
      case 'ai':
        const aiConfig = this.getCurrentAIConfig()
        return aiConfig !== null && aiConfig.baseUrl.length > 0 && aiConfig.apiKey.length > 0 && aiConfig.modelName.length > 0
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
    await config.update('tencent.secretid', '', vscode.ConfigurationTarget.Global)
    await config.update('tencent.secretkey', '', vscode.ConfigurationTarget.Global)
    await config.update('ai.configs', [], vscode.ConfigurationTarget.Global)
    await config.update('ai.currentConfigId', '', vscode.ConfigurationTarget.Global)
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

  /**
   * 保存翻译状态
   */
  static async saveTranslationState(state: { inputText: string; translationResult: any; camelCaseResult: string }): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    console.log('ConfigManager: 保存状态到配置:', state)
    await config.update('state', state, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取翻译状态
   */
  static getTranslationState(): {
    inputText: string
    translationResult: any
    camelCaseResult: string
  } {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const state = config.get('state', {
      inputText: '',
      translationResult: null,
      camelCaseResult: '',
    })
    console.log('ConfigManager: 从配置读取状态:', state)
    return state
  }

  /**
   * 清除翻译状态
   */
  static async clearTranslationState(): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update(
      'state',
      {
        inputText: '',
        translationResult: null,
        camelCaseResult: '',
      },
      vscode.ConfigurationTarget.Global
    )
  }

  /**
   * 获取是否显示驼峰转换按钮的配置
   */
  static getShowCamelCaseButtons(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('showCamelCaseButtons', true)
  }

  /**
   * 设置是否显示驼峰转换按钮
   */
  static async setShowCamelCaseButtons(show: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('showCamelCaseButtons', show, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取是否启用悬浮翻译
   */
  static getHoverTranslationEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('enableHoverTranslation', false)
  }

  /**
   * 设置是否启用悬浮翻译
   */
  static async setHoverTranslationEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('enableHoverTranslation', enabled, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取悬浮翻译延迟时间（毫秒）
   */
  static getHoverTranslationDelay(): number {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('hoverTranslationDelay', 500)
  }

  /**
   * 设置悬浮翻译延迟时间
   */
  static async setHoverTranslationDelay(delay: number): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('hoverTranslationDelay', delay, vscode.ConfigurationTarget.Global)
  }
}
