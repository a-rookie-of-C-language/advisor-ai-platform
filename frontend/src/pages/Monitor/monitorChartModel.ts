import type { MonitorSeriesDTO } from '../../api/monitorApi'

export function toMonitorPolyline(
  points: MonitorSeriesDTO['points'],
  width: number,
  height: number,
): string {
  if (points.length === 0) return ''
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width
      const y = height - ((point.value - min) / span) * height
      return `${x},${y}`
    })
    .join(' ')
}
