import { Alert } from 'antd'
import styles from './MonitorPage.module.css'

interface MonitorAlertsProps {
  latestError: string | null
  alerts?: string[]
}

export function MonitorAlerts({ latestError, alerts }: MonitorAlertsProps) {
  return (
    <>
      {latestError && (
        <Alert style={{ marginBottom: 12 }} type="warning" message={latestError} showIcon />
      )}

      {alerts && alerts.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="error"
          showIcon
          message="监控告警"
          description={(
            <ul className={styles.alertList}>
              {alerts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        />
      )}
    </>
  )
}
