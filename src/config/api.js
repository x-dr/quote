const env = import.meta.env || {}
const DEV_API = 'http://192.168.1.35:3000/api/jdjy'
const PROD_API = 'https://jdjyapi.tryxd.cn/api/jdjy'
const defaultApi = env.DEV ? DEV_API : PROD_API

const endpoint = (value, fallback) => String(value || fallback).replace(/\/+$/, '')

export const BASE_API = endpoint(env.VITE_BASE_API, defaultApi)
export const STRATEGY_API_URL = endpoint(env.VITE_STRATEGY_API, BASE_API)
export const VITE_HOME_FEED_API = endpoint(env.VITE_HOME_FEED_API, BASE_API)

export const GOLD_WS_API = endpoint(env.VITE_GOLD_WS_API, 'wss://cfws.jdjygold.com/data')
export const RTJ_SSE_API = endpoint(
  env.VITE_RTJ_SSE_API,
  env.DEV
    ? 'http://192.168.1.35:3000/api/rtj/stream'
    : 'https://jdjyapi.tryxd.cn/api/rtj/stream',
)
export const PRICE_BIZ_TYPE = {
  GOLD: '1',
}
