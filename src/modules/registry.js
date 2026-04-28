import { lazy } from 'react'

const loadComingSoonModule = () => import('./ComingSoonModule')
const loadGoldMarketModule = () => import('./GoldMarketModule')
const loadStockMarketModule = () => import('./StockMarketModule')

const ComingSoonModule = lazy(loadComingSoonModule)
const GoldMarketModule = lazy(loadGoldMarketModule)
const StockMarketModule = lazy(loadStockMarketModule)

export const marketModules = [
  {
    key: 'gold',
    title: '黄金',
    subtitle: '实时行情 + 网关接口联调',
    status: 'ready',
    component: GoldMarketModule,
    load: loadGoldMarketModule,
  },
  {
    key: 'stock',
    title: '股票',
    subtitle: '多市场指数实时行情',
    status: 'ready',
    component: StockMarketModule,
    load: loadStockMarketModule,
  },
  {
    key: 'silver',
    title: '白银',
    subtitle: '支持现货与纸白银报价',
    status: 'planned',
    component: ComingSoonModule,
    load: loadComingSoonModule,
  },
  {
    key: 'fx',
    title: '汇率',
    subtitle: '主要币对与折算工具',
    status: 'planned',
    component: ComingSoonModule,
    load: loadComingSoonModule,
  },
]
