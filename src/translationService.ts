import { logger } from './logger'
import axios from 'axios'
import { AITranslationConfig, ConfigManager } from './configManager'
import { formatDate, hmacSha256, sha256, sha256Hex, truncate } from './utils/crypto'
import MD5 from './utils/md5'

export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLang: string
  targetLang: string
}

export interface TranslationProvider {
  name: string
  id: string
  needsConfig?: boolean
}

export const TRANSLATION_PROVIDERS: TranslationProvider[] = [
  { id: 'google', name: 'Google 翻译' },
  { id: 'baidu', name: '百度翻译', needsConfig: true },
  { id: 'youdao', name: '有道翻译', needsConfig: true },
  { id: 'tencent', name: '腾讯翻译', needsConfig: true },
  { id: 'ai', name: 'AI翻译', needsConfig: true },
]

export class TranslationService {
  private static instance: TranslationService

  private constructor() {}

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService()
    }
    return TranslationService.instance
  }

  setTranslationProvider(provider: string): void {
    ConfigManager.setProvider(provider)
  }

  getCurrentProvider(): string {
    return ConfigManager.getProvider()
  }

  async setBaiduConfig(appid: string, appkey: string): Promise<void> {
    await ConfigManager.setBaiduConfig(appid, appkey)
  }

  async getBaiduConfig(): Promise<{ appid: string; appkey: string }> {
    return await ConfigManager.getBaiduConfig()
  }

  async setYoudaoConfig(appKey: string, appSecret: string): Promise<void> {
    await ConfigManager.setYoudaoConfig(appKey, appSecret)
  }

  async getYoudaoConfig(): Promise<{ appKey: string; appSecret: string }> {
    return await ConfigManager.getYoudaoConfig()
  }

  async setTencentConfig(secretId: string, secretKey: string): Promise<void> {
    await ConfigManager.setTencentConfig(secretId, secretKey)
  }

  async getTencentConfig(): Promise<{ secretId: string; secretKey: string }> {
    return await ConfigManager.getTencentConfig()
  }

  async getAIConfigs(): Promise<AITranslationConfig[]> {
    return await ConfigManager.getAIConfigsWithSecrets()
  }

  async getCurrentAIConfig(): Promise<AITranslationConfig | null> {
    return await ConfigManager.getCurrentAIConfig()
  }

  async setAIConfigs(configs: AITranslationConfig[]): Promise<void> {
    await ConfigManager.setAIConfigs(configs)
  }

  async addAIConfig(config: AITranslationConfig): Promise<void> {
    await ConfigManager.addAIConfig(config)
  }

  async removeAIConfig(configId: string): Promise<void> {
    await ConfigManager.removeAIConfig(configId)
  }

  async setCurrentAIConfigId(configId: string): Promise<void> {
    await ConfigManager.setCurrentAIConfigId(configId)
  }

  async translateText(text: string): Promise<TranslationResult> {
    if (!text.trim()) {
      throw new Error('输入文本不能为空')
    }

    // 使用比例检测判断语言类型
    const sourceLang = this.detectLanguage(text)
    const targetLang = sourceLang === 'zh' ? 'en' : 'zh'
    const isChineseText = sourceLang === 'zh'

    // 如果是英文文本，进行清洗
    let cleanedText = text
    if (!isChineseText) {
      cleanedText = this.englishClearSelectionText(text)
      //   logger.log('英文文本清洗:', {
      //     original: text,
      //     cleaned: cleanedText,
      //     timestamp: new Date().toISOString(),
      //   })
    }

    try {
      let translatedText: string
      const currentProvider = this.getCurrentProvider()

      switch (currentProvider) {
        case 'baidu':
          translatedText = await this.callBaiduTranslationAPI(cleanedText, sourceLang, targetLang)
          break
        case 'youdao':
          translatedText = await this.callYoudaoTranslationAPI(cleanedText, sourceLang, targetLang)
          break
        case 'tencent':
          translatedText = await this.callTencentTranslationAPI(cleanedText, sourceLang, targetLang)
          break
        case 'ai':
          translatedText = await this.callAITranslationAPI(cleanedText, sourceLang, targetLang)
          break
        case 'google':
        default:
          translatedText = await this.callGoogleTranslationAPI(cleanedText, sourceLang, targetLang)
          break
      }

      return {
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
      }
    } catch (error) {
      const currentProvider = this.getCurrentProvider()
      if (currentProvider === 'google') {
        throw new Error('谷歌翻译需要开启魔法，请尝试开启科学上网或配置其它翻译源。\n详细错误: ' + (error instanceof Error ? error.message : '未知错误'))
      } else {
        throw new Error(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }
  }

  /**
   * 检测文本语言类型（中文 or 英文）
   * 使用中文字符比例判断，提高混合文本识别准确度
   * @param text 待检测的文本
   * @returns 'zh' | 'en'
   */
  private detectLanguage(text: string): 'zh' | 'en' {
    const cleanText = text.trim()

    // 统计中文字符数量（包括中文标点符号）
    const chineseChars = (cleanText.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || []).length

    // 统计总字符数（去除空白字符）
    const totalChars = cleanText.replace(/\s/g, '').length

    // 如果没有有效字符，默认为英文
    if (totalChars === 0) {
      return 'en'
    }

    // 计算中文字符比例
    const chineseRatio = chineseChars / totalChars

    // 如果中文字符超过 20%，判定为中文文本
    return chineseRatio > 0.2 ? 'zh' : 'en'
  }

  // 选中的英文文本清洗干净
  private englishClearSelectionText(text: string): string {
    if (!text) {
      return text
    }

    // 先保留换行符，将换行符替换为特殊标记
    const newlineMarker = '<<<NEWLINE>>>'
    text = text.replace(/\r?\n/g, newlineMarker)

    // 下划线，连接线，小数点自动替换成空格
    text = text.replace(/_|-|\./g, ' ')
    const group = text.split(' ').map((txt) => {
      // 跳过换行标记，不做处理
      if (txt === newlineMarker) {
        return txt
      }

      // 连续的大写字母，不需要处理
      const txtGroup: string[] = []
      for (let i = 0; i < txt.length; i++) {
        if (txt[i].toUpperCase() === txt[i]) {
          // 当前是大写字母
          if (i === 0) {
            // 第一个字母是大写字母，不处理
          } else if (i > 0 && txt[i - 1].toUpperCase() === txt[i - 1]) {
            // 上一个字母也是大写字母，不处理
          } else {
            // 上一个字母是小写字母，需要添加一个空格
            txtGroup.push(' ')
          }
        }
        txtGroup.push(txt[i])
      }
      // 如果是全部大写，不需要处理
      return txtGroup.join('')
    })
    let str = ''
    group.forEach((txt, idx) => {
      if (txt === newlineMarker) {
        // 遇到换行标记，添加换行符
        str += '\n'
      } else if (idx === group.length - 1) {
        // 最后一个不需要空格
        str += txt.trim()
      } else {
        str += txt.trim() + ' '
      }
    })

    // 恢复换行符（防止有遗漏的标记）
    str = str.replace(new RegExp(newlineMarker, 'g'), '\n')

    return str
  }

  /**
   * 测试翻译源连通性
   * @param provider 可选的翻译源，如果不传则测试当前选中的翻译源
   * @returns 返回测试结果信息
   */
  async testConnection(provider?: string): Promise<{ success: boolean; message: string }> {
    const testProvider = provider || this.getCurrentProvider()
    const testText = 'hello'

    try {
      switch (testProvider) {
        case 'google':
          await this.callGoogleTranslationAPI(testText, 'en', 'zh')
          return { success: true, message: 'Google 翻译连接成功' }

        case 'baidu':
          const baiduConfig = await this.getBaiduConfig()
          if (!baiduConfig.appid || !baiduConfig.appkey) {
            return { success: false, message: '百度翻译未配置 APPID 或密钥' }
          }
          await this.callBaiduTranslationAPI(testText, 'en', 'zh')
          return { success: true, message: '百度翻译连接成功' }

        case 'youdao':
          const youdaoConfig = await this.getYoudaoConfig()
          if (!youdaoConfig.appKey || !youdaoConfig.appSecret) {
            return { success: false, message: '有道翻译未配置 AppKey 或 AppSecret' }
          }
          await this.callYoudaoTranslationAPI(testText, 'en', 'zh')
          return { success: true, message: '有道翻译连接成功' }

        case 'tencent':
          const tencentConfig = await this.getTencentConfig()
          if (!tencentConfig.secretId || !tencentConfig.secretKey) {
            return { success: false, message: '腾讯翻译未配置 SecretId 或 SecretKey' }
          }
          await this.callTencentTranslationAPI(testText, 'en', 'zh')
          return { success: true, message: '腾讯翻译连接成功' }

        case 'ai':
          const aiConfig = await this.getCurrentAIConfig()
          if (!aiConfig) {
            return { success: false, message: 'AI翻译未配置任何翻译服务' }
          }
          if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.modelName) {
            return { success: false, message: 'AI翻译配置不完整' }
          }
          await this.callAITranslationAPI(testText, 'en', 'zh')
          return { success: true, message: 'AI翻译连接成功' }

        default:
          return { success: false, message: `未知的翻译源: ${testProvider}` }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      return { success: false, message: `连接失败: ${errorMsg}` }
    }
  }

  private async callGoogleTranslationAPI(text: string, from: string, to: string): Promise<string> {
    try {
      const url = 'https://translate.googleapis.com/translate_a/single'
      const params = {
        client: 'gtx',
        sl: from,
        tl: to,
        dt: 't',
        q: text,
      }

      // 打印请求路径和参数
      //   logger.log('Google翻译API调用:', {
      //     url: url,
      //     params: params,
      //     timestamp: new Date().toISOString(),
      //   })

      const response = await axios.get(url, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      //   logger.log('Google翻译API返回:', {
      //     status: response.status,
      //     data: response.data,
      //     timestamp: new Date().toISOString(),
      //   })

      if (response.data && response.data[0]) {
        // 处理多段话的情况，需要合并所有翻译片段
        const translationSegments = response.data[0]
        if (Array.isArray(translationSegments)) {
          let combinedTranslation = ''
          for (const segment of translationSegments) {
            if (Array.isArray(segment) && segment[0]) {
              combinedTranslation += segment[0]
            }
          }
          if (combinedTranslation) {
            return combinedTranslation.trim()
          }
        }
        // 兼容旧的单段话格式
        else if (translationSegments[0] && translationSegments[0][0]) {
          return translationSegments[0][0]
        }
      }

      throw new Error('翻译API返回数据格式错误')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接')
        }
        if (error.response?.status === 429) {
          throw new Error('请求过于频繁，请稍后再试')
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  private async callBaiduTranslationAPI(text: string, from: string, to: string): Promise<string> {
    const baiduConfig = await this.getBaiduConfig()
    if (!baiduConfig.appid || !baiduConfig.appkey) {
      throw new Error('百度翻译需要配置 APPID 和密钥')
    }

    try {
      const salt = Date.now().toString()
      const sign = MD5(baiduConfig.appid + text + salt + baiduConfig.appkey)
      const url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
      const params = {
        q: text,
        from: from,
        to: to,
        appid: baiduConfig.appid,
        salt: salt,
        sign: sign,
      }

      // 打印请求路径和参数
      //   logger.log('百度翻译API调用:', {
      //     url: url,
      //     params: { ...params, appid: '***', sign: '***' }, // 隐藏敏感信息
      //     timestamp: new Date().toISOString(),
      //   })

      const response = await axios.get(url, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      //   logger.log('百度翻译API返回:', {
      //     status: response.status,
      //     data: response.data,
      //     timestamp: new Date().toISOString(),
      //   })

      if (response.data && Array.isArray(response.data.trans_result) && response.data.trans_result.length > 0) {
        const segments = response.data.trans_result.map((item: { dst?: string }) => item?.dst).filter((dst: any): dst is string => !!dst)

        if (segments.length > 0) {
          // 将百度返回的分段结果合并，保持多行内容
          return segments.join('\n')
        }
      }

      if (response.data && response.data.error_code) {
        const errorCode = response.data.error_code
        const errorMessages: { [key: string]: string } = {
          '54001': '签名错误，请检查APPID和密钥是否正确',
          '54003': '访问频率受限，请降低调用频率',
          '54004': '账户余额不足',
          '58001': '译文语言方向不支持',
          '58002': '服务当前已关闭',
          '52001': '请求超时',
          '52002': '系统错误',
          '52003': '未授权用户，请检查APPID是否正确',
        }
        throw new Error(errorMessages[errorCode] || `百度翻译错误: ${errorCode}`)
      }

      throw new Error('百度翻译API返回数据格式错误')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接')
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  private async callYoudaoTranslationAPI(text: string, from: string, to: string): Promise<string> {
    const youdaoConfig = await this.getYoudaoConfig()
    if (!youdaoConfig.appKey || !youdaoConfig.appSecret) {
      throw new Error('有道翻译需要配置 AppKey 和 AppSecret')
    }

    try {
      const salt = Date.now().toString()
      const curtime = Math.round(Date.now() / 1000).toString()
      const input = truncate(text)
      const signStr = youdaoConfig.appKey + input + salt + curtime + youdaoConfig.appSecret
      const sign = sha256(signStr)

      // 转换语言代码
      const fromLang = this.convertToYoudaoLang(from)
      const toLang = this.convertToYoudaoLang(to)

      const url = 'https://openapi.youdao.com/api'
      const params = {
        q: text,
        from: fromLang,
        to: toLang,
        appKey: youdaoConfig.appKey,
        salt: salt,
        sign: sign,
        signType: 'v3',
        curtime: curtime,
      }

      // 打印请求路径和参数
      //   logger.log('有道翻译API调用:', {
      //     url: url,
      //     params: { ...params, appKey: '***', sign: '***' }, // 隐藏敏感信息
      //     timestamp: new Date().toISOString(),
      //   })

      const response = await axios.post(url, null, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      //   logger.log('有道翻译API返回:', {
      //     status: response.status,
      //     data: response.data,
      //     timestamp: new Date().toISOString(),
      //   })

      if (response.data && response.data.errorCode === '0') {
        if (response.data.translation && response.data.translation.length > 0) {
          return response.data.translation[0]
        }
      }

      if (response.data && response.data.errorCode !== '0') {
        const errorCode = response.data.errorCode
        const errorMessages: { [key: string]: string } = {
          '101': '缺少必填的参数',
          '102': '不支持的语言类型',
          '103': '翻译文本过长',
          '108': '应用ID无效',
          '110': '无相关服务的有效应用',
          '111': '开发者账号无效',
          '202': '签名检验失败，请检查AppKey和AppSecret是否正确',
          '401': '账户已经欠费，请进行账户充值',
          '411': '访问频率受限，请稍后访问',
        }
        throw new Error(errorMessages[errorCode] || `有道翻译错误: ${errorCode}`)
      }

      throw new Error('有道翻译API返回数据格式错误')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接')
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  private convertToYoudaoLang(lang: string): string {
    const langMap: { [key: string]: string } = {
      zh: 'zh-CHS',
      en: 'en',
    }
    return langMap[lang] || lang
  }

  private async callTencentTranslationAPI(text: string, from: string, to: string): Promise<string> {
    const tencentConfig = await this.getTencentConfig()
    if (!tencentConfig.secretId || !tencentConfig.secretKey) {
      throw new Error('腾讯翻译需要配置 SecretId 和 SecretKey')
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const date = formatDate(timestamp)

      const service = 'tmt'
      const version = '2018-03-21'
      const action = 'TextTranslate'
      const host = 'tmt.tencentcloudapi.com'
      const algorithm = 'TC3-HMAC-SHA256'

      const payload = JSON.stringify({
        SourceText: text,
        Source: this.convertToTencentLang(from),
        Target: this.convertToTencentLang(to),
        ProjectId: 0,
      })

      const hashedRequestPayload = sha256Hex(payload)
      const httpRequestMethod = 'POST'
      const canonicalUri = '/'
      const canonicalQueryString = ''
      const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\nx-tc-timestamp:${timestamp}\nx-tc-version:${version}\n`
      const signedHeaders = 'content-type;host;x-tc-action;x-tc-timestamp;x-tc-version'

      const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`

      const credentialScope = `${date}/${service}/tc3_request`
      const hashedCanonicalRequest = sha256Hex(canonicalRequest)
      const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

      const secretDate = hmacSha256(`TC3${tencentConfig.secretKey}`, date)
      const secretService = hmacSha256(secretDate, service)
      const secretSigning = hmacSha256(secretService, 'tc3_request')
      const signature = hmacSha256(secretSigning, stringToSign).toString('hex')

      const authorization = `${algorithm} Credential=${tencentConfig.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

      const url = `https://${host}/`
      const headers = {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: host,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': version,
        'X-TC-Region': 'ap-guangzhou',
      }

      //   logger.log('腾讯翻译API调用:', {
      //     url: url,
      //     headers: { ...headers, Authorization: '***' },
      //     payload: payload,
      //     timestamp: new Date().toISOString(),
      //   })

      const response = await axios.post(url, payload, {
        headers: headers,
        timeout: 10000,
      })

      //   logger.log('腾讯翻译API返回:', {
      //     status: response.status,
      //     data: response.data,
      //     timestamp: new Date().toISOString(),
      //   })

      if (response.data && response.data.Response) {
        if (response.data.Response.Error) {
          const errorCode = response.data.Response.Error.Code
          const errorMessage = response.data.Response.Error.Message
          throw new Error(`腾讯翻译错误 (${errorCode}): ${errorMessage}`)
        }

        if (response.data.Response.TargetText) {
          return response.data.Response.TargetText
        }
      }

      throw new Error('腾讯翻译API返回数据格式错误')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请检查网络连接')
        }
        if (error.response?.data?.Response?.Error) {
          const apiError = error.response.data.Response.Error
          throw new Error(`腾讯翻译错误 (${apiError.Code}): ${apiError.Message}`)
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  private convertToTencentLang(lang: string): string {
    const langMap: { [key: string]: string } = {
      zh: 'zh',
      en: 'en',
    }
    return langMap[lang] || lang
  }

  private async callAITranslationAPI(text: string, from: string, to: string): Promise<string> {
    const aiConfig = await this.getCurrentAIConfig()
    if (!aiConfig) {
      throw new Error('AI翻译需要先配置翻译服务')
    }

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.modelName) {
      throw new Error('AI翻译配置不完整，请检查BaseURL、API Key和模型名称')
    }

    try {
      const sourceLang = from === 'zh' ? '中文' : '英文'
      const targetLang = to === 'zh' ? '中文' : '英文'

      let prompt = aiConfig.prompt || `请将以下${sourceLang}文本翻译成${targetLang}，只返回翻译结果，不要添加任何解释或其他内容：`

      // 如果用户没有在提示词中包含翻译文本的占位符，则在末尾添加
      if (!prompt.includes('{text}')) {
        prompt = `${prompt}\n\n${text}`
      } else {
        prompt = prompt.replace('{text}', text)
      }

      const requestBody = {
        model: aiConfig.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }

      // 直接使用用户填写的Base URL，不进行任何路径处理
      const apiUrl = aiConfig.baseUrl.replace(/\/$/, '') // 只去除尾部斜杠，保持用户原始配置

      //   logger.log('AI翻译API调用:', {
      //     baseUrl: aiConfig.baseUrl,
      //     finalUrl: apiUrl,
      //     model: aiConfig.modelName,
      //     vendor: aiConfig.vendor,
      //     requestBody: requestBody,
      //     headers: {
      //       'Content-Type': 'application/json',
      //       Authorization: `Bearer ${aiConfig.apiKey.substring(0, 10)}...`, // 只显示API Key前10位
      //     },
      //     timestamp: new Date().toISOString(),
      //   })

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        timeout: 30000,
      })

      //   logger.log('AI翻译API返回:', {
      //     status: response.status,
      //     statusText: response.statusText,
      //     headers: response.headers,
      //     data: response.data,
      //     timestamp: new Date().toISOString(),
      //   })

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const result = response.data.choices[0].message?.content || ''
        // logger.log('AI翻译成功:', {
        //   result: result,
        //   resultLength: result.length,
        //   timestamp: new Date().toISOString(),
        // })
        if (result.trim()) {
          return result.trim()
        }
      }

      logger.error('AI翻译API返回数据格式错误:', {
        hasData: !!response.data,
        hasChoices: !!(response.data && response.data.choices),
        choicesLength: response.data?.choices?.length || 0,
        data: response.data,
        timestamp: new Date().toISOString(),
      })
      throw new Error('AI翻译API返回数据格式错误或内容为空')
    } catch (error) {
      logger.error('AI翻译API请求异常:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : '未知错误',
        isAxiosError: axios.isAxiosError(error),
        timestamp: new Date().toISOString(),
      })

      if (axios.isAxiosError(error)) {
        logger.error('Axios错误详情:', {
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data,
          },
          timestamp: new Date().toISOString(),
        })

        if (error.code === 'ECONNABORTED') {
          throw new Error('AI翻译请求超时，请检查网络连接或BaseURL是否正确')
        }
        if (error.response?.status === 401) {
          throw new Error('AI翻译API认证失败，请检查API Key是否正确')
        }
        if (error.response?.status === 404) {
          throw new Error('AI翻译API地址不存在，请检查BaseURL是否正确')
        }
        if (error.response?.data?.error?.message) {
          throw new Error(`AI翻译错误: ${error.response.data.error.message}`)
        }
        throw new Error(`AI翻译网络请求失败: ${error.message}`)
      }
      throw error
    }
  }
}
