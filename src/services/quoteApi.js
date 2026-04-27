import {
  BASE_API,
  STRATEGY_API_URL,
  VITE_HOME_FEED_API,
  STOCK_API,
} from '../config/api'
import { gwPost, request } from './http'

export const queryStallNew = (query) =>
  request({
    url: `${STRATEGY_API_URL}/gw2/generic/6440/h5/m/queryStallForGold`,
    method: 'post',
    rData: query,
  })

export const stockFormat = (params) =>
  gwPost(`${STOCK_API}/appstock/app/q/qt/simple/query/format?`, params, {
    verifyResponse: false,
  })

export const cfGetSimpleQuote = (params) =>
  gwPost(`${BASE_API}/gw/generic/hj/h5/m/cfGetSimpleQuote`, params, {
    verifyResponse: false,
  })

export const cfGetKlineInfo = (params) =>
  gwPost(`${BASE_API}/gw/generic/hj/h5/m/cfGetKlineInfo`, params, {
    verifyResponse: false,
  })

export const cfGetMinKlineInfo = (params) =>
  gwPost(`${BASE_API}/gw/generic/hj/h5/m/cfGetMinKlineInfo`, params, {
    verifyResponse: false,
  })

export const cfgetTimeSharingDots = (params) =>
  gwPost(`${BASE_API}/gw/generic/hj/h5/m/cfgetTimeSharingDots`, params, {
    verifyResponse: false,
  })

export const getRangeTimeSharingDotsByNums = (params) =>
  gwPost(`${BASE_API}/gw/generic/hj/h5/m/getRangeTimeSharingDotsByNums`, params, {
    verifyResponse: false,
  })

export const homeFeedFlow = (query) =>
  gwPost(`${VITE_HOME_FEED_API}/gw/generic/jimu/h5/m/homeFeedFlow`, query, {
    verifyResponse: false,
  })
