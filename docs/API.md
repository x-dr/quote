# 黄金行情 API 文档

本文档仅描述当前单黄金页面实际保留的接口与实时数据源。

## 1. 环境配置

接口地址统一由 `src/config/api.js` 管理：

| 环境变量 | 用途 |
| --- | --- |
| `VITE_BASE_API` | 黄金 REST 网关，默认前缀 `/api/jdjy` |
| `VITE_STRATEGY_API` | 黄金策略接口地址 |
| `VITE_HOME_FEED_API` | 黄金资讯接口地址 |
| `VITE_GOLD_WS_API` | 黄金实时 WebSocket 地址 |
| `VITE_RTJ_SSE_API` | RTJ 贵金属 SSE 地址 |

本地示例见项目根目录 `.env.example`。

## 2. REST 请求约定

- Method：`POST`
- Content-Type：`application/x-www-form-urlencoded;charset=UTF-8`
- 默认超时：15 秒
- 请求体：业务参数序列化到表单字段 `reqData`

```txt
reqData={"uniqueCode":"WG-JDAU"}
```

`quoteApi.js` 当前使用 `verifyResponse: false`，因此调用方会收到网关原始响应：

```json
{
  "resultCode": 0,
  "resultMsg": "成功",
  "resultData": {
    "data": {}
  }
}
```

## 3. 黄金 REST 接口

| 前端方法 | 网关路径 | 用途 |
| --- | --- | --- |
| `queryStallNew` | `/queryStallForGold` | 黄金策略查询 |
| `cfGetSimpleQuote` | `/cfGetSimpleQuote` | 黄金报价快照 |
| `cfGetKlineInfo` | `/cfGetKlineInfo` | 日 K 数据 |
| `cfGetMinKlineInfo` | `/cfGetMinKlineInfo` | 分钟 K 数据 |
| `cfgetTimeSharingDots` | `/cfgetTimeSharingDots` | 分时数据 |
| `getRangeTimeSharingDotsByNums` | `/getRangeTimeSharingDotsByNums` | 分时增量数据 |
| `homeFeedFlow` | `/homeFeedFlow` | 黄金投机情绪/资讯 |
| `getGoldCountryList` | `/getGoldCountryList` | 央行储备国家列表 |
| `getHistoryETFSpreads` | `/getHistoryETFSpreads` | ETF 历史数据 |
| `getGoldETFChange` | `/getGoldETFChange` | ETF 变化数据 |
| `getMsHistoryETFSpreads` | `/getMsHistoryETFSpreads` | ETF 详情历史数据 |
| `getHistoryGoldCentralBankReserve` | `/getHistoryGoldCentralBankReserve` | 央行黄金储备 |
| `getGoldCentralBankChange` | `/getGoldCentralBankChange` | 央行购金变化 |

### 3.1 黄金报价

```json
{
  "uniqueCode": "WG-JDAU"
}
```

页面同时使用以下代码：

| 代码 | 展示名称 |
| --- | --- |
| `WG-JDAU` | 京东黄金 |
| `WG-XAUUSD` | 伦敦金 |
| `SGE-Au99.99` | 黄金 9999 |

### 3.2 K 线

- 日 K：`cfGetKlineInfo`
- 分钟 K：`cfGetMinKlineInfo`
- 支持周期：1、5、15、30、60、120 分钟
- 页面会按时间戳合并首屏数据与增量数据

### 3.3 央行储备与 ETF

公共字段：

| 字段 | 说明 |
| --- | --- |
| `appChanel` | 渠道字段，当前传空字符串 |
| `country` | 国家编码，默认 `CHN` |
| `from` | 起始日期，格式 `yyyy-MM-dd` |
| `num` | 查询跨度，负数表示向前查询 |

## 4. 黄金 WebSocket

- 地址：`VITE_GOLD_WS_API`
- 默认值：`wss://cfws.jdjygold.com/data`
- 客户端：`src/services/wsClient.js`
- 页面订阅：京东黄金、伦敦金、黄金 9999
- 能力：心跳、指数退避重连、重新订阅、主动断开

订阅报文：

```json
{
  "action": "2",
  "bizType": "2",
  "keys": ["WG-JDAU"]
}
```

## 5. RTJ 贵金属 SSE

- URL：`VITE_RTJ_SSE_API`
- Method：`GET`
- 协议：`EventSource / text/event-stream`
- 事件：`init`、`status`、`quote`
- 当前消费位置：`src/modules/GoldMarketModule.jsx`

## 6. 调用示例

```bash
curl 'http://127.0.0.1:3000/api/jdjy/cfGetSimpleQuote' \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data-raw 'reqData={"uniqueCode":"WG-JDAU"}'
```

```bash
curl -N 'http://127.0.0.1:3000/api/rtj/stream'
```

## 7. 维护约定

- 新增黄金接口时同步更新 `src/services/quoteApi.js` 和本文档。
- 页面继续保持单黄金入口，不引入其他市场导航。
- 表格使用稳定 `rowKey`；实时连接必须保留失败提示与重连路径。
