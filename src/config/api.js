// export const BASE_API = 'https://api.jdjygold.com'
// export const STRATEGY_API_URL = 'https://api.jdjygold.com'
// export const VITE_HOME_FEED_API = 'https://api.jdjygold.com'
// export const STOCK_API = 'https://quoteapi.jd.com'
const DEVAPI = 'http://192.168.1.35:3000/api/jdjy'
const PRODAPI = 'https://jdjyapi.tryxd.cn/api/jdjy'

export const BASE_API = import.meta.env.DEV ? DEVAPI : PRODAPI
export const STRATEGY_API_URL = import.meta.env.DEV ? DEVAPI : PRODAPI
export const VITE_HOME_FEED_API = import.meta.env.DEV ? DEVAPI : PRODAPI
export const STOCK_API = 'http://127.0.0.1:3000/proxy'

export const GOLD_WS_API = 'wss://cfws.jdjygold.com/data'
export const RTJ_SSE_API = import.meta.env.DEV
  ? 'http://192.168.1.35:3000/api/rtj/stream'
  : 'https://jdjyapi.tryxd.cn/api/rtj/stream'
export const TXQUOTE_SSE_API = import.meta.env.DEV
  ? 'http://192.168.1.35:3000/api/txquote/stream'
  : 'https://jdjyapi.tryxd.cn/api/txquote/stream'

export const PRICE_BIZ_TYPE = {
  GOLD: '1',
  STOCK: '2',
  STOCK_RT: '2-1',
  FUND: '3',
  FUTURES: '3-1',
  PRECIOUS_METALS: '4-1',
}
