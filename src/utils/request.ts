const GOOGLE_TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single'

const DEFAULT_TIMEOUT_MS = 5000

export interface TranslateResult {
  translatedText: string
  fallback: boolean
}

const normalizeGoogleResponse = (data: any): string => {
  if (!Array.isArray(data?.[0])) {
    return ''
  }

  return data[0]
    .map((part: any[]) => (Array.isArray(part) ? part[0] : ''))
    .filter(Boolean)
    .join('')
}

export async function translateText(
  text: string,
  target = 'id',
  source = 'auto',
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TranslateResult> {
  const trimmedText = text.trim()

  if (!trimmedText) {
    return { translatedText: '', fallback: true }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url =
      `${GOOGLE_TRANSLATE_URL}?` +
      new URLSearchParams({
        client: 'gtx',
        sl: source,
        tl: target,
        dt: 't',
        q: trimmedText,
      })

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Google Translate failed with HTTP ${res.status}`)
    }

    const data = await res.json()
    const translatedText = normalizeGoogleResponse(data).trim()

    return {
      translatedText: translatedText || trimmedText,
      fallback: !translatedText,
    }
  } catch (error) {
    console.warn('Google Translate request failed:', error)
    return {
      translatedText: trimmedText,
      fallback: true,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
