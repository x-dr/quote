const DEFAULT_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
}

const stringifyReqData = (payload = {}) =>
  new URLSearchParams({
    reqData: JSON.stringify(payload),
  }).toString()

const parseJsonSafe = async (response) => {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error('网关返回了非 JSON 数据', { cause: error })
  }
}

const normalizeGatewayError = (data, fallbackMessage = '请求失败') => {
  if (typeof data === 'string') {
    return data
  }

  if (data && typeof data === 'object') {
    return data.resultMsg || data.msg || data.message || fallbackMessage
  }

  return fallbackMessage
}

export const gwPost = async (url, params = {}, options = {}) => {
  const { verifyResponse = true, signal } = options

  const response = await fetch(url, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    credentials: 'include',
    body: stringifyReqData(params),
    signal,
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(normalizeGatewayError(data, `HTTP ${response.status}`))
  }

  if (!verifyResponse) {
    return data
  }

  if (data?.resultCode === 0) {
    return data.resultData
  }

  throw new Error(normalizeGatewayError(data, '网关返回错误'))
}

export const request = async ({ url, method = 'post', rData = {}, ...options }) => {
  if (method.toLowerCase() !== 'post') {
    throw new Error('当前仅封装了 POST 请求')
  }

  return gwPost(url, rData, options)
}
