# Quote

基于 React + Vite + Ant Design 的行情看板项目，当前包含黄金与股票两类行情模块。

## 功能概览

- 黄金模块：实时快照、分时/日K/分钟K、投机情绪、ETF 与央行储备数据图表
- 股票模块：`txquote` SSE 实时指数看板，覆盖 A 股、港股与美股核心指数
- WebSocket 实时推送：行情状态展示与重连
- REST + 轮询：首屏快照 + 增量合并
- 模块化扩展：白银/汇率入口已预留（规划中）

## 项目文档

- API 文档：`docs/API.md`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

默认监听 `0.0.0.0`，便于局域网设备访问。

### 3. 构建与预览

```bash
npm run build
npm run preview
```

### 4. 代码检查

```bash
npm run lint
```

## 目录结构

```txt
src/
	config/         # 接口与环境配置
	modules/        # 业务模块（gold/stock/coming-soon）
	services/       # HTTP/WS/网关 API 封装
	assets/         # 静态资源
```

## 接口与数据源说明

- REST 网关 API 在 `src/config/api.js` 配置
- 当前默认通过本地代理访问：
	- `BASE_API`: `http://127.0.0.1:3000/api/jdjy`
	- `STOCK_API`: `http://127.0.0.1:3000/proxy`
- 黄金实时 WS：`wss://cfws.jdjygold.com/data`
- 股票实时 SSE：`/api/txquote/stream`

## 技术栈

- React 19
- Vite 8
- Ant Design 6
- ESLint 10

## 后续建议

- 若新增接口，请同步更新 `src/services/quoteApi.js` 与 `docs/API.md`
- 若新增业务模块，请在 `src/modules/registry.js` 注册
