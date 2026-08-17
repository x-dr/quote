# JDJY Market

基于 React + Vite + Ant Design 的单一黄金行情看板，前端数据通过 `/root/jdjyapi/golang` Go 网关统一接入。

## 功能概览

- 黄金实时快照与报价联动
- 分时、日 K 与 1/5/15/30/60/120 分钟 K 线
- RTJ 贵金属行情、投机情绪、ETF 与央行储备数据
- WebSocket 实时推送：行情状态展示与重连
- REST + 轮询：首屏快照 + 增量合并

## 项目文档

- API 文档：`docs/API.md`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
cp .env.example .env.local
npm run dev
```

按本机代理地址调整 `.env.local` 后启动。开发服务器默认监听 `0.0.0.0`，便于局域网设备访问。

### 3. 构建与预览

```bash
npm run build
npm run preview
```

### 4. 质量检查

```bash
npm run test
npm run lint
```

## 目录结构

```txt
src/
	config/         # 接口与环境配置
	modules/        # 黄金行情模块
	services/       # HTTP/WS/网关 API 封装
	assets/         # 静态资源
```

## 接口与数据源说明

- REST、SSE 与 WebSocket 地址统一在 `src/config/api.js` 管理
- 可通过 `.env.local` 中的 `VITE_*` 变量覆盖，完整示例见 `.env.example`
- 黄金实时 WS 默认使用 `wss://cfws.jdjygold.com/data`
- RTJ 通过 Go 网关 SSE 持续推送
- 网关请求默认 15 秒超时，调用方也可传入 `timeout` 或 `signal`

## 技术栈

- React 19
- Vite 8
- Ant Design 6
- ESLint 10

## 后续建议

- 若新增接口，请同步更新 `src/services/quoteApi.js` 与 `docs/API.md`
- 页面保持单黄金入口；新增黄金数据源时优先扩展 `GoldMarketModule`
