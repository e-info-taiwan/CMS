import { GoogleGenAI } from '@google/genai'
import { RawDraftContentState, RawDraftContentBlock } from 'draft-js'
import envVar from '../environment-variables'

export class AIPollHelperService {
  private ai: GoogleGenAI | null = null

  /**
   * 檢查 API Key 是否已設定
   * @returns boolean
   */
  private checkAPIKey(): boolean {
    return !!envVar.ai.gemini.apiKey
  }

  /**
   * 初始化 Google GenAI 服務
   */
  private initializeGenAI(): void {
    if (!this.checkAPIKey()) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({})
    }
  }

  /**
   * 生成投票建議
   * @param content 文章內文
   * @returns AI 生成的投票建議
   */
  async generatePollSuggestion(content: string): Promise<string> {
    try {
      // 檢查 API Key 並初始化服務
      this.initializeGenAI()

      // 提取純文字內容
      const textContent = this.extractTextFromRichText(content)

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('文章內容為空')
      }

      // 構建 prompt
      const prompt = this.buildPrompt(textContent)

      // 呼叫 Gemini API
      const result = await this.callGeminiAPI(prompt)

      return result
    } catch (error) {
      console.error('AI Poll Helper Error:', error)
      throw error
    }
  }

  /**
   * 從 Rich Text 內容中提取純文字
   * @param content Rich Text 內容
   * @returns 純文字內容
   */
  private extractTextFromRichText(
    content: RawDraftContentState | string
  ): string {
    if (!content) return ''

    // 如果是字串，直接返回
    if (typeof content === 'string') return content

    // 如果是 Draft.js 格式，提取文字
    if (content.blocks && Array.isArray(content.blocks)) {
      return content.blocks
        .map((block: RawDraftContentBlock) => block.text || '')
        .join('\n')
        .trim()
    }

    // 如果是其他格式，嘗試轉換為字串
    try {
      return JSON.stringify(content)
    } catch {
      return ''
    }
  }

  /**
   * 構建 AI prompt
   * @param content 文章內容
   * @returns 完整的 prompt
   */
  private buildPrompt(content: string): string {
    return `我們是關心環境議題的網路媒體，希望透過文章與讀者互動，在保持趣味性、引導讀者反思的同時，了解他們的看法與感受。請針對以下文章，判斷是否適合發起投票。若適合，請提供一個投票題目與五個選項。其餘都不要多做解釋。

要求：非閱讀測驗或重點摘要題、非引導性或敏感性問題。不該過度簡化文章主旨。

回答格式：
1. 是否適合發起投票：是/否，並一句話簡述理由。
2. 投票題目
3. 五個選項

文章：${content}`
  }

  /**
   * 呼叫 Gemini API
   * @param prompt 提示詞
   * @returns AI 回應
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      if (!this.ai) {
        throw new Error('AI service not initialized')
      }

      const result = await this.ai.models.generateContent({
        model: envVar.ai.gemini.model,
        contents: prompt,
      })
      const text = result.text

      if (!text || text.trim().length === 0) {
        console.error('AI 回應為空')
        throw new Error('SERVER_ERROR')
      }

      return text.trim()
    } catch (error) {
      console.error('Gemini API Error:', error)

      // 根據 Gemini API 官方錯誤代碼進行分類
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()

        // API Key 未設定錯誤
        if (errorMessage.includes('gemini_api_key_not_configured')) {
          throw new Error('API_KEY_NOT_CONFIGURED')
        }
        // 400 系列錯誤 (客戶端錯誤)
        else if (
          errorMessage.includes('invalid argument') ||
          errorMessage.includes('bad request') ||
          errorMessage.includes('failed precondition') ||
          errorMessage.includes('billing') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('api key') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('resource exhausted') ||
          errorMessage.includes('rate limit')
        ) {
          throw new Error('CLIENT_ERROR')
        }
        // 500 系列錯誤 (服務器錯誤)
        else if (
          errorMessage.includes('internal') ||
          errorMessage.includes('server error') ||
          errorMessage.includes('unavailable') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('deadline exceeded') ||
          errorMessage.includes('timeout')
        ) {
          throw new Error('SERVER_ERROR')
        }
      }

      // 預設錯誤歸類為服務器錯誤
      throw new Error('SERVER_ERROR')
    }
  }
}

// 建立單例實例
export const aiPollHelperService = new AIPollHelperService()
