import {
  BASE_API,
  STRATEGY_API_URL,
  VITE_HOME_FEED_API,
} from '../config/api'
import { gwPost, request } from './http'

export const queryStallNew = (query) =>
  request({
    url: `${STRATEGY_API_URL}/queryStallForGold`,
    method: 'post',
    rData: query,
  })

export const cfGetSimpleQuote = (params) =>
  gwPost(`${BASE_API}/cfGetSimpleQuote`, params, {
    verifyResponse: false,
  })

export const cfGetKlineInfo = (params) =>
  gwPost(`${BASE_API}/cfGetKlineInfo`, params, {
    verifyResponse: false,
  })

export const cfGetMinKlineInfo = (params) =>
  gwPost(`${BASE_API}/cfGetMinKlineInfo`, params, {
    verifyResponse: false,
  })

export const cfgetTimeSharingDots = (params) =>
  gwPost(`${BASE_API}/cfgetTimeSharingDots`, params, {
    verifyResponse: false,
  })

export const getRangeTimeSharingDotsByNums = (params) =>
  gwPost(`${BASE_API}/getRangeTimeSharingDotsByNums`, params, {
    verifyResponse: false,
  })

export const homeFeedFlow = (query) =>
  gwPost(`${VITE_HOME_FEED_API}/homeFeedFlow`, query, {
    verifyResponse: false,
  })

export const getGoldCountryList = (params) =>
  gwPost(`${BASE_API}/getGoldCountryList`, params, {
    verifyResponse: false,
  })

export const getHistoryETFSpreads = (params) =>
  gwPost(`${BASE_API}/getHistoryETFSpreads`, params, {
    verifyResponse: false,
  })

export const getGoldETFChange = (params) =>
  gwPost(`${BASE_API}/getGoldETFChange`, params, {
    verifyResponse: false,
  })

export const getMsHistoryETFSpreads = (params) =>
  gwPost(`${BASE_API}/getMsHistoryETFSpreads`, params, {
    verifyResponse: false,
  })

export const getHistoryGoldCentralBankReserve = (params) =>
  gwPost(`${BASE_API}/getHistoryGoldCentralBankReserve`, params, {
    verifyResponse: false,
  })

export const getGoldCentralBankChange = (params) =>
  gwPost(`${BASE_API}/getGoldCentralBankChange`, params, {
    verifyResponse: false,
  })
