import { logger } from './logger'
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
 * 敏感信息（密钥）使用 SecretStorage 安全存储
 */
export class ConfigManager {
  private static readonly SECTION = 'transgo'
  private static context: vscode.ExtensionContext

  /**
   * 初始化配置管理器
   * 必须在 extension activate 时调用
   */
  static initialize(context: vscode.ExtensionContext): void {
    this.context = context
  }

  /**
   * 获取 SecretStorage 实例
   */
  private static getSecrets(): vscode.SecretStorage {
    if (!this.context) {
      throw new Error('ConfigManager 未初始化，请先调用 initialize()')
    }
    return this.context.secrets
  }

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
  static async getBaiduConfig(): Promise<{ appid: string; appkey: string }> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const appkey = (await this.getSecrets().get('transgo.baidu.appkey')) || ''
    return {
      appid: config.get('baidu.appid', ''),
      appkey,
    }
  }

  /**
   * 设置百度翻译配置
   */
  static async setBaiduConfig(appid: string, appkey: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('baidu.appid', appid, vscode.ConfigurationTarget.Global)
    await this.getSecrets().store('transgo.baidu.appkey', appkey)
  }

  /**
   * 获取有道翻译配置
   */
  static async getYoudaoConfig(): Promise<{ appKey: string; appSecret: string }> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const appSecret = (await this.getSecrets().get('transgo.youdao.appsecret')) || ''
    return {
      appKey: config.get('youdao.appkey', ''),
      appSecret,
    }
  }

  /**
   * 设置有道翻译配置
   */
  static async setYoudaoConfig(appKey: string, appSecret: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('youdao.appkey', appKey, vscode.ConfigurationTarget.Global)
    await this.getSecrets().store('transgo.youdao.appsecret', appSecret)
  }

  /**
   * 获取腾讯翻译配置
   */
  static async getTencentConfig(): Promise<{ secretId: string; secretKey: string }> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const secretKey = (await this.getSecrets().get('transgo.tencent.secretkey')) || ''
    return {
      secretId: config.get('tencent.secretid', ''),
      secretKey,
    }
  }

  /**
   * 设置腾讯翻译配置
   */
  static async setTencentConfig(secretId: string, secretKey: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('tencent.secretid', secretId, vscode.ConfigurationTarget.Global)
    await this.getSecrets().store('transgo.tencent.secretkey', secretKey)
  }

  /**
   * 获取AI翻译配置列表（不包含apiKey）
   */
  static getAIConfigs(): Omit<AITranslationConfig, 'apiKey'>[] {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('ai.configs', [])
  }

  /**
   * 获取完整的AI翻译配置列表（包含从SecretStorage读取的apiKey）
   */
  static async getAIConfigsWithSecrets(): Promise<AITranslationConfig[]> {
    const configs = this.getAIConfigs()
    const configsWithKeys = await Promise.all(
      configs.map(async (config) => {
        const apiKey = (await this.getSecrets().get(`transgo.ai.config.${config.id}.apiKey`)) || ''
        return { ...config, apiKey }
      })
    )
    return configsWithKeys
  }

  /**
   * 设置AI翻译配置列表（apiKey单独存储到SecretStorage）
   */
  static async setAIConfigs(configs: AITranslationConfig[]): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    
    // 分离 apiKey 和其他配置
    const configsWithoutKeys = configs.map(({ apiKey, ...rest }) => rest)
    await config.update('ai.configs', configsWithoutKeys, vscode.ConfigurationTarget.Global)
    
    // 将 apiKey 存储到 SecretStorage
    for (const cfg of configs) {
      if (cfg.apiKey) {
        await this.getSecrets().store(`transgo.ai.config.${cfg.id}.apiKey`, cfg.apiKey)
      }
    }
  }

  /**
   * 添加AI翻译配置
   */
  static async addAIConfig(newConfig: AITranslationConfig): Promise<void> {
    const configs = await this.getAIConfigsWithSecrets()
    const existingIndex = configs.findIndex((c) => c.id === newConfig.id)
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
    logger.log('ConfigManager: 开始删除AI配置，ID:', configId)
    const configs = await this.getAIConfigsWithSecrets()
    logger.log('删除前的配置列表:', configs)

    const filteredConfigs = configs.filter((c) => c.id !== configId)
    logger.log('过滤后的配置列表:', filteredConfigs)

    await this.setAIConfigs(filteredConfigs)
    
    // 删除对应的 apiKey
    await this.getSecrets().delete(`transgo.ai.config.${configId}.apiKey`)
    logger.log('配置已保存到VSCode设置')

    // 如果删除的是当前选中的配置，需要更新选中状态
    const currentConfigId = this.getCurrentAIConfigId()
    logger.log('当前选中的配置ID:', currentConfigId)

    if (currentConfigId === configId) {
      logger.log('删除的是当前选中的配置，需要更新选中状态')
      if (filteredConfigs.length > 0) {
        // 选择第一个剩余的配置
        logger.log('选择第一个剩余配置:', filteredConfigs[0].id)
        await this.setCurrentAIConfigId(filteredConfigs[0].id)
      } else {
        // 没有配置了，清空选择
        logger.log('没有配置了，清空选择')
        await this.setCurrentAIConfigId('')
      }
    }
    logger.log('删除AI配置完成')
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
  static async getCurrentAIConfig(): Promise<AITranslationConfig | null> {
    const configs = await this.getAIConfigsWithSecrets()
    const currentId = this.getCurrentAIConfigId()
    return configs.find((c) => c.id === currentId) || null
  }

  /**
   * 检查当前配置是否完整
   */
  static async isConfigured(): Promise<boolean> {
    const provider = this.getProvider()

    switch (provider) {
      case 'baidu':
        const baiduConfig = await this.getBaiduConfig()
        return baiduConfig.appid.length > 0 && baiduConfig.appkey.length > 0
      case 'youdao':
        const youdaoConfig = await this.getYoudaoConfig()
        return youdaoConfig.appKey.length > 0 && youdaoConfig.appSecret.length > 0
      case 'tencent':
        const tencentConfig = await this.getTencentConfig()
        return tencentConfig.secretId.length > 0 && tencentConfig.secretKey.length > 0
      case 'ai':
        const aiConfig = await this.getCurrentAIConfig()
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
    await config.update('youdao.appkey', '', vscode.ConfigurationTarget.Global)
    await config.update('tencent.secretid', '', vscode.ConfigurationTarget.Global)
    await config.update('ai.configs', [], vscode.ConfigurationTarget.Global)
    await config.update('ai.currentConfigId', '', vscode.ConfigurationTarget.Global)
    
    // 清除所有存储在 SecretStorage 中的密钥
    const secrets = this.getSecrets()
    await secrets.delete('transgo.baidu.appkey')
    await secrets.delete('transgo.youdao.appsecret')
    await secrets.delete('transgo.tencent.secretkey')
    await secrets.delete('transgo.tts.tencent.secretKey')
    await secrets.delete('transgo.tts.volcano.accessKey')
    
    // 清除所有 AI 配置的 apiKey
    const configs = this.getAIConfigs()
    for (const cfg of configs) {
      await secrets.delete(`transgo.ai.config.${cfg.id}.apiKey`)
    }
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
    // logger.log('ConfigManager: 保存状态到配置:', state)
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
    logger.log('ConfigManager: 从配置读取状态:', state)
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
   * 使用三重保护：配置默认值 + API默认值 + 代码兜底
   */
  static getHoverTranslationEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const value = config.get('enableHoverTranslation', true)
    // 三重保护：确保返回值为布尔类型，兜底默认为 true（新版本默认开启）
    return value === true || value === false ? value : true
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
   * 使用三重保护确保返回有效的数值
   */
  static getHoverTranslationDelay(): number {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const value = config.get('hoverTranslationDelay', 500)
    // 确保返回值为有效数字，范围在100-2000毫秒之间
    return typeof value === 'number' && value >= 100 && value <= 2000 ? value : 500
  }

  /**
   * 设置悬浮翻译延迟时间
   */
  static async setHoverTranslationDelay(delay: number): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('hoverTranslationDelay', delay, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取TTS服务提供商
   */
  static getTTSProvider(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get('tts.provider', 'system')
  }

  /**
   * 设置TTS服务提供商
   */
  static async setTTSProvider(provider: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('tts.provider', provider, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取腾讯TTS配置
   */
  static async getTencentTTSConfig(): Promise<{ secretId: string; secretKey: string; voiceType: number }> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const secretKey = (await this.getSecrets().get('transgo.tts.tencent.secretKey')) || ''
    return {
      secretId: config.get('tts.tencent.secretId', ''),
      secretKey,
      voiceType: config.get('tts.tencent.voiceType', 101001),
    }
  }

  /**
   * 设置腾讯TTS配置
   */
  static async setTencentTTSConfig(secretId: string, secretKey: string, voiceType: number): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('tts.tencent.secretId', secretId, vscode.ConfigurationTarget.Global)
    await this.getSecrets().store('transgo.tts.tencent.secretKey', secretKey)
    await config.update('tts.tencent.voiceType', voiceType, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取火山TTS配置
   */
  static async getVolcanoTTSConfig(): Promise<{ appId: string; accessKey: string; resourceId: string; speaker: string }> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    const accessKey = (await this.getSecrets().get('transgo.tts.volcano.accessKey')) || ''
    const result = {
      appId: config.get('tts.volcano.appId', ''),
      accessKey,
      resourceId: config.get('tts.volcano.resourceId', 'seed-tts-2.0'),
      speaker: config.get('tts.volcano.speaker', 'zh_female_vv_uranus_bigtts'),
    }
    logger.log('[ConfigManager] 获取火山TTS配置, appId:', result.appId, 'resourceId:', result.resourceId, 'speaker:', result.speaker)
    return result
  }

  /**
   * 设置火山TTS配置
   */
  static async setVolcanoTTSConfig(appId: string, accessKey: string, resourceId: string, speaker: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('tts.volcano.appId', appId, vscode.ConfigurationTarget.Global)
    await this.getSecrets().store('transgo.tts.volcano.accessKey', accessKey)
    await config.update('tts.volcano.resourceId', resourceId, vscode.ConfigurationTarget.Global)
    await config.update('tts.volcano.speaker', speaker, vscode.ConfigurationTarget.Global)
    logger.log('[ConfigManager] 火山TTS配置已保存, appId:', appId, 'resourceId:', resourceId, 'speaker:', speaker)
  }

  /**
   * 获取悬浮替换格式配置
   * @returns 格式类型：none | pascalCase | camelCase | snakeCase | kebabCase
   */
  static getHoverReplaceFormat(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    return config.get<string>('hoverReplaceFormat', 'none')
  }

  /**
   * 设置悬浮替换格式配置
   * @param format 格式类型
   */
  static async setHoverReplaceFormat(format: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SECTION)
    await config.update('hoverReplaceFormat', format, vscode.ConfigurationTarget.Global)
  }
}
