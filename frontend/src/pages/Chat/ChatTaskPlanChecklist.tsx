import { type ReactNode } from 'react'
import { Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import {
  type ChatMessage,
  planStepStatus,
  planStepTitle,
  planStepsFromPayload,
  taskPlanFromEvents,
} from './chatMessageModel'
import styles from './ChatPage.module.css'

const { Text } = Typography

interface ChatTaskPlanChecklistProps {
  msg: ChatMessage
}

function planStepStatusMeta(status: ReturnType<typeof planStepStatus>): {
  label: string
  color: string
  icon: ReactNode
} {
  if (status === 'done') {
    return { label: '已完成', color: 'green', icon: <CheckCircleOutlined /> }
  }
  if (status === 'running') {
    return { label: '进行中', color: 'blue', icon: <LoadingOutlined /> }
  }
  if (status === 'error') {
    return { label: '失败', color: 'red', icon: <ExclamationCircleOutlined /> }
  }
  return { label: '待执行', color: 'default', icon: <ClockCircleOutlined /> }
}

export function ChatTaskPlanChecklist({ msg }: ChatTaskPlanChecklistProps) {
  const plan = taskPlanFromEvents(msg.events)
  const steps = planStepsFromPayload(plan)
  if (!plan || steps.length === 0 || msg.role !== 'assistant') {
    return null
  }
  const requiredTools = Array.isArray(plan.required_tools) ? plan.required_tools.filter(Boolean) : []

  return (
    <div className={styles.taskPlan}>
      <div className={styles.taskPlanHeader}>
        <div>
          <Text strong>待办清单</Text>
          {plan.goal && (
            <Text type="secondary" className={styles.taskPlanGoal}>
              {plan.goal}
            </Text>
          )}
        </div>
        {plan.mode && <Tag color="blue">{plan.mode}</Tag>}
      </div>
      {plan.summary && (
        <Text type="secondary" className={styles.taskPlanSummary}>
          {plan.summary}
        </Text>
      )}
      {requiredTools.length > 0 && (
        <div className={styles.taskPlanTools}>
          {requiredTools.map((tool) => <Tag key={tool} color="geekblue">{tool}</Tag>)}
        </div>
      )}
      <div className={styles.taskPlanSteps}>
        {steps.map((step, index) => {
          const status = planStepStatus(step, msg)
          const meta = planStepStatusMeta(status)
          return (
            <div
              key={`${step.action ?? 'step'}:${step.tool_name ?? index}:${index}`}
              className={`${styles.taskPlanStep} ${status === 'done' ? styles.taskPlanStepDone : ''}`}
            >
              <div className={styles.taskPlanStepMain}>
                <Tag color={meta.color} icon={meta.icon} className={styles.taskPlanStatus}>
                  {meta.label}
                </Tag>
                <Text strong delete={status === 'done'}>{planStepTitle(step, index)}</Text>
              </div>
              {(step.reason || step.expected_outcome || step.summary) && (
                <Text type="secondary" className={styles.taskPlanStepDetail}>
                  {step.reason || step.summary}
                  {step.expected_outcome ? `；预期：${step.expected_outcome}` : ''}
                </Text>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
