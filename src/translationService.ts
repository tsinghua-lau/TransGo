import axios from 'axios'
import { ConfigManager } from './configManager'
import { sha256, truncate, hmacSha256, sha256Hex, formatDate } from './utils/crypto'
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
]

export class TranslationService {
  private static instance: TranslationService

  private constructor() {}

  // 选中的英文文本清洗干净
  private englishClearSelectionText(text: string): string {
    if (!text) {
      return text
    }

    // 下划线，连接线，小数点自动替换成空格
    text = text.replace(/_|-|\./g, ' ')
    const group = text.split(' ').map((txt) => {
      // 连续的大写字母，不需要处理
      const txtGroup: string[] = []
      for (let i = 0; i < txt.length; i++) {
        if (txt[i].toUpperCase() === txt[i]) {
          // 当前是大写字母
          if (i === 0) {
            // 第一个字母是大写字母，不处理
            // continue
          } else if (i > 0 && txt[i - 1].toUpperCase() === txt[i - 1]) {
            // 上一个字母也是大写字母，不处理
            // continue
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
      if (idx === group.length - 1) {
        // 最后一个不需要空格
        str += txt.trim()
      } else {
        str += txt.trim() + ' '
      }
    })
    return str
  }

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

  setBaiduConfig(appid: string, appkey: string): void {
    ConfigManager.setBaiduConfig(appid, appkey)
  }

  getBaiduConfig(): { appid: string; appkey: string } {
    return ConfigManager.getBaiduConfig()
  }

  setYoudaoConfig(appKey: string, appSecret: string): void {
    ConfigManager.setYoudaoConfig(appKey, appSecret)
  }

  getYoudaoConfig(): { appKey: string; appSecret: string } {
    return ConfigManager.getYoudaoConfig()
  }

  setTencentConfig(secretId: string, secretKey: string): void {
    ConfigManager.setTencentConfig(secretId, secretKey)
  }

  getTencentConfig(): { secretId: string; secretKey: string } {
    return ConfigManager.getTencentConfig()
  }

  async translateText(text: string): Promise<TranslationResult> {
    if (!text.trim()) {
      throw new Error('输入文本不能为空')
    }

    // 数据清洗：如果是英文文本，进行清洗处理
    const isChineseText = /[\u4e00-\u9fa5]/.test(text)
    const sourceLang = isChineseText ? 'zh' : 'en'
    const targetLang = isChineseText ? 'en' : 'zh'

    // 如果是英文文本，进行清洗
    let cleanedText = text
    if (!isChineseText) {
      cleanedText = this.englishClearSelectionText(text)
      console.log('英文文本清洗:', {
        original: text,
        cleaned: cleanedText,
        timestamp: new Date().toISOString(),
      })
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
      console.log('Google翻译API调用:', {
        url: url,
        params: params,
        timestamp: new Date().toISOString(),
      })

      const response = await axios.get(url, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      console.log('Google翻译API返回:', {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      })

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
    const baiduConfig = this.getBaiduConfig()
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
      console.log('百度翻译API调用:', {
        url: url,
        params: { ...params, appid: '***', sign: '***' }, // 隐藏敏感信息
        timestamp: new Date().toISOString(),
      })

      const response = await axios.get(url, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      console.log('百度翻译API返回:', {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      })

      if (response.data && response.data.trans_result && response.data.trans_result[0]) {
        return response.data.trans_result[0].dst
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
    const youdaoConfig = this.getYoudaoConfig()
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
      console.log('有道翻译API调用:', {
        url: url,
        params: { ...params, appKey: '***', sign: '***' }, // 隐藏敏感信息
        timestamp: new Date().toISOString(),
      })

      const response = await axios.post(url, null, {
        params: params,
        timeout: 10000,
      })

      // 打印返回结果
      console.log('有道翻译API返回:', {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      })

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
    const tencentConfig = this.getTencentConfig()
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
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': version,
        'X-TC-Region': 'ap-guangzhou',
      }

      console.log('腾讯翻译API调用:', {
        url: url,
        headers: { ...headers, Authorization: '***' },
        payload: payload,
        timestamp: new Date().toISOString(),
      })

      const response = await axios.post(url, payload, {
        headers: headers,
        timeout: 10000,
      })

      console.log('腾讯翻译API返回:', {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      })

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
}
