import { translateText } from '../../utils/request'

type SubtitlePosition = 'bottom' | 'top'

interface ExtensionSettings {
  enabled: boolean
  targetLanguage: string
  sourceLanguage: string
  bilingualMode: boolean
  subtitlePosition: SubtitlePosition
}

interface TranslateRequest {
  type: 'TRANSLATE_TEXT'
  text: string
  targetLanguage?: string
  sourceLanguage?: string
}

const TRANSLATION_CACHE_KEY = 'translationCache'

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  targetLanguage: 'id',
  sourceLanguage: 'auto',
  bilingualMode: true,
  subtitlePosition: 'bottom',
}

const getStorageData = <T>(
  keys: string[] | Record<string, unknown> | null,
): Promise<T> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
        return
      }

      resolve(result as T)
    })
  })

const setStorageData = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
        return
      }

      resolve()
    })
  })

const buildCacheKey = (
  text: string,
  targetLanguage = DEFAULT_SETTINGS.targetLanguage,
  sourceLanguage = DEFAULT_SETTINGS.sourceLanguage,
): string => `${sourceLanguage}:${targetLanguage}:${text.trim()}`

const getSettings = async (): Promise<ExtensionSettings> => {
  const stored = await getStorageData<Partial<ExtensionSettings>>(
    DEFAULT_SETTINGS as unknown as Record<string, unknown>,
  )

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
  }
}

const ensureDefaultSettings = async () => {
  const stored = await getStorageData<Partial<ExtensionSettings>>(null)
  const updates: Partial<ExtensionSettings> = {}

  Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
    if (stored[key as keyof ExtensionSettings] === undefined) {
      ;(updates as Record<string, unknown>)[key] = value
    }
  })

  if (Object.keys(updates).length > 0) {
    await setStorageData(updates as Record<string, unknown>)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultSettings().catch((error) => {
    console.error('Failed to initialize default settings:', error)
  })
})

chrome.runtime.onStartup.addListener(() => {
  ensureDefaultSettings().catch((error) => {
    console.error('Failed to initialize default settings:', error)
  })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_TEXT') {
    handleTranslationRequest(request, sendResponse)
    return true
  }

  if (request.type === 'CLEAR_TRANSLATION_CACHE') {
    setStorageData({ [TRANSLATION_CACHE_KEY]: {} })
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, error: String(error?.message || error) }),
      )
    return true
  }

  return false
})

const handleTranslationRequest = async (
  request: TranslateRequest,
  sendResponse: (response: any) => void,
) => {
  const originalText = request.text?.trim()

  if (!originalText) {
    sendResponse({
      type: 'TRANSLATED_TEXT',
      translatedText: '',
      fallback: true,
      fromCache: false,
    })
    return
  }

  try {
    const settings = await getSettings()

    if (!settings.enabled) {
      sendResponse({
        type: 'TRANSLATION_SKIPPED',
        reason: 'disabled',
      })
      return
    }

    const targetLanguage =
      request.targetLanguage || settings.targetLanguage || 'id'
    const sourceLanguage =
      request.sourceLanguage || settings.sourceLanguage || 'auto'
    const cacheKey = buildCacheKey(
      originalText,
      targetLanguage,
      sourceLanguage,
    )
    const stored = await getStorageData<{
      translationCache?: Record<string, string>
    }>([TRANSLATION_CACHE_KEY])
    const translationCache = stored.translationCache || {}

    if (translationCache[cacheKey]) {
      sendResponse({
        type: 'TRANSLATED_TEXT',
        translatedText: translationCache[cacheKey],
        fallback: false,
        fromCache: true,
      })
      return
    }

    const result = await translateText(
      originalText,
      targetLanguage,
      sourceLanguage,
    )

    if (!result.fallback) {
      await setStorageData({
        [TRANSLATION_CACHE_KEY]: {
          ...translationCache,
          [cacheKey]: result.translatedText,
        },
      })
    }

    sendResponse({
      type: 'TRANSLATED_TEXT',
      translatedText: result.translatedText,
      fallback: result.fallback,
      fromCache: false,
    })
  } catch (error: any) {
    console.error('Translation request failed:', error)
    sendResponse({
      type: 'TRANSLATION_ERROR',
      error: error?.message || 'Translation failed',
      translatedText: originalText,
      fallback: true,
    })
  }
}
