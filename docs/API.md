# 行情服务 API 文档

本文档基于前端服务层接口定义与实际调用点整理，来源：

- `src/services/quoteApi.js`
- `src/services/http.js`
- `src/modules/GoldMarketModule.jsx`
- `src/modules/goldMarket/helpers.jsx`
- `src/modules/goldMarket/hooks/useGoldDetailDrawers.js`

## 1. 基础信息

- 基础域名（本地代理）
  - `BASE_API`: `http://127.0.0.1:3000/api/jdjy`
  - `STRATEGY_API_URL`: `http://127.0.0.1:3000/api/jdjy`
  - `VITE_HOME_FEED_API`: `http://127.0.0.1:3000/api/jdjy`
  - `STOCK_API`: `http://127.0.0.1:3000/proxy`
- 请求方法：`POST`
- 请求头：`Content-Type: application/x-www-form-urlencoded;charset=UTF-8`
- 认证信息：`credentials: include`（会携带 Cookie）

## 2. 通用请求格式

所有接口统一通过表单字段 `reqData` 传参：

```txt
reqData={"uCode":"WG-JDAU","type":1}
```

等价代码：

```js
const body = new URLSearchParams({
  reqData: JSON.stringify(payload),
}).toString()
```

## 3. 通用返回约定

当前 `quoteApi.js` 所有方法都传了 `verifyResponse: false`，因此返回值是网关原始响应（不会自动拆到 `resultData`）。

常见网关结构：

```json
{
  "resultCode": 0,
  "resultMsg": "success",
  "resultData": {
    "data": {}
  }
}
```

## 4. 接口索引

| 方法名 | 路径 | 当前调用状态 |
| --- | --- | --- |
| `queryStallNew` | `/queryStallForGold` | 暂未在当前页面调用 |
| `stockFormat` | `/appstock/app/q/qt/simple/query/format?` | 暂未在当前页面调用 |
| `cfGetSimpleQuote` | `/cfGetSimpleQuote` | 已调用 |
| `cfGetKlineInfo` | `/cfGetKlineInfo` | 已调用 |
| `cfGetMinKlineInfo` | `/cfGetMinKlineInfo` | 已调用 |
| `cfgetTimeSharingDots` | `/cfgetTimeSharingDots` | 已调用 |
| `getRangeTimeSharingDotsByNums` | `/getRangeTimeSharingDotsByNums` | 已调用 |
| `homeFeedFlow` | `/homeFeedFlow` | 已调用 |
| `getGoldCountryList` | `/getGoldCountryList` | 已调用 |
| `getHistoryETFSpreads` | `/getHistoryETFSpreads` | 已调用 |
| `getGoldETFChange` | `/getGoldETFChange` | 已调用 |
| `getMsHistoryETFSpreads` | `/getMsHistoryETFSpreads` | 已调用 |
| `getHistoryGoldCentralBankReserve` | `/getHistoryGoldCentralBankReserve` | 已调用 |
| `getGoldCentralBankChange` | `/getGoldCentralBankChange` | 已调用 |

## 5. 字段级文档

说明：

- “字段说明”优先基于现有调用代码与解析逻辑。
- “示例返回”是前端可消费的最小结构示例，字段名按当前解析器兼容范围给出。

### 5.1 queryStallNew

- Method: `POST`
- URL: `${STRATEGY_API_URL}/queryStallForGold`
- 调用封装: `request({ url, method: 'post', rData: query })`

参数说明（当前仓库暂无调用样例）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `object` | 是 | 业务查询对象，字段待后端协议定义 |

示例入参：

```json
{}
```

示例返回（网关通用）：

```json
{
  "resultCode": 0,
  "resultMsg": "success",
  "resultData": {}
}
```

### 5.2 stockFormat

- Method: `POST`
- URL: `${STOCK_API}/appstock/app/q/qt/simple/query/format?`

参数说明（当前仓库暂无调用样例）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params` | `object` | 是 | 股票格式化查询参数，字段待后端协议定义 |

示例入参：

```json
{}
```

示例返回（网关通用）：

```json
{
  "resultCode": 0,
  "resultMsg": "success",
  "resultData": {}
}
```

### 5.3 cfGetSimpleQuote

- Method: `POST`
- URL: `${BASE_API}/cfGetSimpleQuote`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `uniqueCode` | `string` | 是 | 行情标的编码 | `WG-JDAU` |

示例入参：

```json
{
  "uniqueCode": "WG-JDAU"
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "datas": [
      {
        "uniqueCode": "WG-JDAU",
        "latestPrice": "1036.32",
        "changeAmount": "2.10",
        "changePercent": "0.20",
        "openPrice": "1032.00",
        "preClose": "1034.22",
        "highPrice": "1038.01",
        "lowPrice": "1031.66",
        "tradeDateTime": "20260427142335"
      }
    ]
  }
}
```

### 5.4 cfGetKlineInfo

- Method: `POST`
- URL: `${BASE_API}/cfGetKlineInfo`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `type` | `number` | 是 | K 线类型，日 K 场景固定 `1` | `1` |
| `fq` | `number` | 否 | 复权标记，首屏请求使用 `1` | `1` |
| `uCode` | `string` | 是 | 标的编码 | `WG-JDAU` |
| `count` | `number` | 否 | 增量条数 | `100` |
| `date` | `string` | 否 | 增量锚点日期 `yyyyMMdd` | `20260427` |

示例入参（首屏）：

```json
{
  "type": 1,
  "fq": 1,
  "uCode": "WG-JDAU"
}
```

示例入参（增量）：

```json
{
  "type": 1,
  "fq": 1,
  "uCode": "WG-JDAU",
  "count": 100,
  "date": "20260427"
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "klineInfo": [
        ["20260425", "1028.12", "1035.20", "1036.00", "1026.89", "1034.20"],
        ["20260426", "1034.20", "1037.40", "1039.33", "1032.11", "1036.92"]
      ]
    }
  }
}
```

### 5.5 cfGetMinKlineInfo

- Method: `POST`
- URL: `${BASE_API}/cfGetMinKlineInfo`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `type` | `number` | 是 | 分钟周期，支持 `1/5/15/30/60/120` | `1` |
| `fq` | `number` | 否 | 首屏请求使用 `1` | `1` |
| `uCode` | `string` | 是 | 标的编码 | `WG-JDAU` |
| `count` | `number` | 否 | 增量条数 | `100` |
| `dateTime` | `string` | 否 | 增量锚点 `yyyyMMddHHmmss` | `20260427142530` |

示例入参（首屏）：

```json
{
  "type": 1,
  "fq": 1,
  "uCode": "WG-JDAU"
}
```

示例入参（增量）：

```json
{
  "type": 1,
  "uCode": "WG-JDAU",
  "count": 100,
  "dateTime": "20260427142530"
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "klineInfo": [
        ["20260427142000", "1035.11", "1035.88", "1036.02", "1035.00", "1035.66"],
        ["20260427142100", "1035.66", "1035.72", "1035.90", "1035.52", "1035.70"]
      ]
    }
  }
}
```

### 5.6 cfgetTimeSharingDots

- Method: `POST`
- URL: `${BASE_API}/cfgetTimeSharingDots`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `uniqueCode` | `string` | 是 | 标的编码 | `WG-JDAU` |
| `type` | `string` | 是 | 分时粒度，当前使用 `m1` | `m1` |
| `dateTime` | `string` | 否 | 请求时间锚点 `yyyyMMddHHmmss` | `20260427142530` |

示例入参：

```json
{
  "uniqueCode": "WG-JDAU",
  "type": "m1",
  "dateTime": "20260427142530"
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "timeSharingDotItemDTOList": [
        {
          "lastPrice": "1035.66",
          "tradeDateTime": "20260427142000",
          "viewDateTime": "2026-04-27 14:20:00"
        },
        {
          "lastPrice": "1035.70",
          "tradeDateTime": {
            "year": 2026,
            "monthValue": 4,
            "dayOfMonth": 27,
            "hour": 14,
            "minute": 21,
            "second": 0
          }
        }
      ]
    }
  }
}
```

### 5.7 getRangeTimeSharingDotsByNums

- Method: `POST`
- URL: `${BASE_API}/getRangeTimeSharingDotsByNums`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `uniqueCode` | `string` | 是 | 标的编码 | `WG-JDAU` |
| `type` | `string` | 是 | 分时粒度，当前使用 `m1` | `m1` |
| `nums` | `number` | 是 | 返回条数 | `120` |
| `dateTime` | `string` | 否 | 时间锚点 `yyyyMMddHHmmss` | `20260427142530` |

示例入参（首屏补齐）：

```json
{
  "uniqueCode": "WG-JDAU",
  "type": "m1",
  "nums": 120,
  "dateTime": "20260427142530"
}
```

示例入参（轮询增量）：

```json
{
  "uniqueCode": "WG-JDAU",
  "type": "m1",
  "nums": 3,
  "dateTime": "20260427142530"
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "timeSharingDots": [
        {
          "lastPrice": "1035.66",
          "tradeDateTime": "20260427142000"
        }
      ]
    }
  }
}
```

### 5.8 homeFeedFlow

- Method: `POST`
- URL: `${VITE_HOME_FEED_API}/homeFeedFlow`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `lastId` | `string` | 否 | 分页游标，首屏传空 | `""` |
| `tagId` | `number` | 是 | 内容标签 ID，当前用 `20826` | `20826` |
| `invokeSource` | `string` | 是 | 调用来源 | `lego` |
| `extParams` | `object` | 否 | 扩展参数对象 | `{ "requestFrom": "h5" }` |
| `extParams.requestFrom` | `string` | 否 | 端标识 | `h5` |

示例入参：

```json
{
  "lastId": "",
  "tagId": 20826,
  "invokeSource": "lego",
  "extParams": {
    "requestFrom": "h5"
  }
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "resultList": [
      {
        "contentId": "123456",
        "content": "投机情绪：短线偏多",
        "publishTime": "2026-04-27 14:20:00",
        "imgUrlList": ["https://example.com/a.png"],
        "jumpData": {
          "jumpUrl": "https://example.com/detail/123456"
        }
      }
    ]
  }
}
```

### 5.9 getGoldCountryList

- Method: `POST`
- URL: `${BASE_API}/getGoldCountryList`

参数说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | 当前调用传空对象 `{}` |

示例入参：

```json
{}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "countryList": [
        {
          "code": "CHN",
          "cn": "中国",
          "en": "China",
          "icon": "https://example.com/cn.png"
        }
      ]
    }
  }
}
```

### 5.10 getHistoryETFSpreads

- Method: `POST`
- URL: `${BASE_API}/getHistoryETFSpreads`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `from` | `string` | 是 | 起始日期 `yyyy-MM-dd` | `2026-04-27` |
| `num` | `number` | 是 | 返回条数（负数表示向前） | `-200` |

示例入参：

```json
{
  "from": "2026-04-27",
  "num": -200
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "updateAt": "2026-04-27",
      "etfDataList": [
        ["2026-04-24", "864.31"],
        ["2026-04-25", "865.12"]
      ]
    }
  }
}
```

### 5.11 getGoldETFChange

- Method: `POST`
- URL: `${BASE_API}/getGoldETFChange`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `appChanel` | `string` | 否 | 渠道字段，当前传空字符串 | `""` |
| `from` | `string` | 是 | 起始日期 `yyyy-MM-dd` | `2026-03-27` |
| `num` | `number` | 是 | 返回条数（负数表示向前） | `-20` |

示例入参：

```json
{
  "appChanel": "",
  "from": "2026-03-27",
  "num": -20
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "startDate": "2026-03-07",
      "changeList": [
        ["2026-04-24", "-1.12"],
        ["2026-04-25", "0.87"]
      ]
    }
  }
}
```

### 5.12 getMsHistoryETFSpreads

- Method: `POST`
- URL: `${BASE_API}/getMsHistoryETFSpreads`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `appChanel` | `string` | 否 | 渠道字段，当前传空字符串 | `""` |
| `country` | `string` | 是 | 国家编码 | `CHN` |
| `from` | `string` | 是 | 起始日期 `yyyy-MM-dd` | `2026-04-27` |
| `num` | `number` | 是 | 返回条数（负数表示向前） | `-1000` |

示例入参：

```json
{
  "appChanel": "",
  "country": "CHN",
  "from": "2026-04-27",
  "num": -1000
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "updateAt": "2026-04-27",
      "publisher": "美国SPDR Gold Trust",
      "etfDataList": [
        ["2026-04-24", "864.31"],
        ["2026-04-25", "865.12"]
      ]
    }
  }
}
```

### 5.13 getHistoryGoldCentralBankReserve

- Method: `POST`
- URL: `${BASE_API}/getHistoryGoldCentralBankReserve`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `appChanel` | `string` | 否 | 渠道字段，部分调用传空字符串 | `""` |
| `country` | `string` | 是 | 国家编码 | `CHN` |
| `from` | `string` | 是 | 起始日期 `yyyy-MM-dd` | `2026-04-27` |
| `num` | `number` | 否 | 返回条数（负数向前） | `-1000` |
| `to` | `number` | 否 | 时间终点，部分调用使用 `-1` | `-1` |

示例入参（数据图表）：

```json
{
  "country": "CHN",
  "from": "2026-04-01",
  "num": -1000
}
```

示例入参（详情抽屉）：

```json
{
  "appChanel": "",
  "country": "CHN",
  "from": "2026-04-27",
  "to": -1
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "updateAt": "2026-04-27",
      "tag": "央行储备",
      "weightReserveList": [
        ["2026-01", "2279.56"],
        ["2026-02", "2285.14"]
      ],
      "valueReserveList": [
        ["2026-01", "1940.21"],
        ["2026-02", "1953.64"]
      ]
    }
  }
}
```

### 5.14 getGoldCentralBankChange

- Method: `POST`
- URL: `${BASE_API}/getGoldCentralBankChange`

参数说明：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `appChanel` | `string` | 否 | 渠道字段，当前传空字符串 | `""` |
| `country` | `string` | 是 | 国家编码 | `CHN` |
| `from` | `string` | 是 | 起始日期 `yyyy-MM-dd` | `2026-03-27` |
| `num` | `number` | 是 | 返回条数（负数向前） | `-20` |

示例入参：

```json
{
  "appChanel": "",
  "country": "CHN",
  "from": "2026-03-27",
  "num": -20
}
```

示例返回：

```json
{
  "resultCode": 0,
  "resultData": {
    "data": {
      "startDate": "2026-03-07",
      "weightChangeList": [
        ["2026-04-24", "1.20"],
        ["2026-04-25", "-0.32"]
      ],
      "valueChangeList": [
        ["2026-04-24", "8.18"],
        ["2026-04-25", "-2.04"]
      ]
    }
  }
}
```

## 6. cURL 示例模板

```bash
curl 'http://127.0.0.1:3000/api/jdjy/cfGetMinKlineInfo' \
  -H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' \
  --data-raw 'reqData={"type":1,"fq":1,"uCode":"WG-JDAU"}'
```

## 7. 维护建议

- 新增接口时，先在 `src/services/quoteApi.js` 添加方法，再同步更新本文档“接口索引 + 字段级文档”。
- 若后续将某些方法改成 `verifyResponse: true`，需在文档中注明“返回值已自动拆包为 `resultData`”。
- 对于当前“暂无调用样例”的接口，建议补一份联调报文后再细化字段定义。
