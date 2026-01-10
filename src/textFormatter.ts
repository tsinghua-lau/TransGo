/**
 * 文本格式转换工具类
 * 用于将翻译结果转换为不同的命名格式
 */
export class TextFormatter {
  /**
   * 大驼峰（PascalCase）
   * 例如: "hello world" → "HelloWorld"
   */
  static toPascalCase(text: string): string {
    if (typeof text !== 'string') return ''

    // 空白字符列表（包括中文空格、零宽空格等）
    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF']
    let result = ''

    // 将所有空白字符替换为下划线
    for (const ch of text) {
      if (spaceChars.includes(ch)) {
        result += '_'
      } else {
        result += ch
      }
    }

    // 按下划线或中划线分割，每个单词首字母大写
    return result
      .trim()
      .split(/[_\-]+/)
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }

  /**
   * 小驼峰（camelCase）
   * 例如: "hello world" → "helloWorld"
   */
  static toCamelCase(text: string): string {
    const pascalCase = TextFormatter.toPascalCase(text)
    if (pascalCase.length === 0) return ''
    // 首字母小写
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1)
  }

  /**
   * 下划线（snake_case）
   * 例如: "hello world" → "hello_world"
   */
  static toSnakeCase(text: string): string {
    if (typeof text !== 'string') return ''

    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF']
    let result = ''

    // 将所有空白字符替换为下划线
    for (const ch of text) {
      if (spaceChars.includes(ch)) {
        result += '_'
      } else {
        result += ch
      }
    }

    // 按下划线或中划线分割，全部小写，用下划线连接
    return result
      .trim()
      .split(/[_\-]+/)
      .filter((word) => word.length > 0)
      .map((word) => word.toLowerCase())
      .join('_')
  }

  /**
   * 中划线（kebab-case）
   * 例如: "hello world" → "hello-world"
   */
  static toKebabCase(text: string): string {
    // 复用下划线转换，然后替换下划线为中划线
    return TextFormatter.toSnakeCase(text).replace(/_/g, '-')
  }

  /**
   * 根据格式类型转换文本
   * @param text 待转换的文本
   * @param formatType 格式类型：none | pascalCase | camelCase | snakeCase | kebabCase
   * @returns 转换后的文本
   */
  static format(text: string, formatType: string): string {
    switch (formatType) {
      case 'pascalCase':
        return TextFormatter.toPascalCase(text)
      case 'camelCase':
        return TextFormatter.toCamelCase(text)
      case 'snakeCase':
        return TextFormatter.toSnakeCase(text)
      case 'kebabCase':
        return TextFormatter.toKebabCase(text)
      case 'none':
      default:
        return text
    }
  }

  /**
   * 获取格式类型的显示名称
   */
  static getFormatDisplayName(formatType: string): string {
    const names: { [key: string]: string } = {
      none: '原文',
      pascalCase: '大驼峰',
      camelCase: '小驼峰',
      snakeCase: '下划线',
      kebabCase: '中划线',
    }
    return names[formatType] || '原文'
  }
}
