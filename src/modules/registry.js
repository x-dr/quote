import {
  CrownOutlined,
  GlobalOutlined,
  LineChartOutlined,
  FundOutlined,
} from '@ant-design/icons'
import ComingSoonModule from './ComingSoonModule'
import GoldMarketModule from './GoldMarketModule'

export const marketModules = [
  {
    key: 'gold',
    title: '黄金',
    subtitle: '实时行情 + 网关接口联调',
    icon: CrownOutlined,
    status: 'ready',
    component: GoldMarketModule,
  },
  {
    key: 'stock',
    title: '股票',
    subtitle: '多交易市场与自选池',
    icon: LineChartOutlined,
    status: 'planned',
    component: ComingSoonModule,
  },
  {
    key: 'silver',
    title: '白银',
    subtitle: '支持现货与纸白银报价',
    icon: FundOutlined,
    status: 'planned',
    component: ComingSoonModule,
  },
  {
    key: 'fx',
    title: '汇率',
    subtitle: '主要币对与折算工具',
    icon: GlobalOutlined,
    status: 'planned',
    component: ComingSoonModule,
  },
]
