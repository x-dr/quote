import { Card, Col, Row, Tag, Typography } from 'antd'

const plans = [
  '统一接入实时行情 WS 与降级轮询',
  '按品类拆分独立 API 适配层',
  '支持策略信号、告警与自定义看板',
]

function ComingSoonModule({ title, subtitle }) {
  return (
    <div className="module-enter">
      <Card className="panel-card" variant="borderless">
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {title} 模块建设中
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 20 }}>
          {subtitle}
        </Typography.Paragraph>
        <Row gutter={[12, 12]}>
          {plans.map((plan) => (
            <Col xs={24} md={8} key={plan}>
              <Card size="small" className="plan-card">
                <Tag color="gold">Roadmap</Tag>
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {plan}
                </Typography.Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}

export default ComingSoonModule
