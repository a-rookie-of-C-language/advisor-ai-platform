import { Card, Col, Row, Statistic } from 'antd'
import { dashboardStats } from './dashboardData'

export default function DashboardStatsGrid() {
  return (
    <Row gutter={[16, 16]}>
      {dashboardStats.map((stat) => (
        <Col xs={24} sm={12} lg={6} key={stat.title}>
          <Card
            style={{
              background: stat.color,
              border: 'none',
              borderRadius: 10,
              transition: 'box-shadow 200ms ease',
            }}
            styles={{ body: { padding: '20px 24px' } }}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  padding: 10,
                  background: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                {stat.icon}
              </div>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ fontSize: 24, fontWeight: 600 }}
              />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
