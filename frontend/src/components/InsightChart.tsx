import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import type { InsightChart, InsightChartData } from '@/api/insights'

interface InsightChartProps {
  chart: InsightChart
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
]

function formatData(data: InsightChartData[]) {
  return data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }))
}

export default function InsightChartComponent({ chart }: InsightChartProps) {
  const { type, title, explanation, x_axis_label, y_axis_label, chart_data } = chart
  const formattedData = formatData(chart_data)

  const renderChart = () => {
    switch (type) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                nameKey="label"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" />
              <YAxis label={y_axis_label ? { value: y_axis_label, angle: -90, position: 'insideLeft' } : undefined} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" />
              <YAxis label={y_axis_label ? { value: y_axis_label, angle: -90, position: 'insideLeft' } : undefined} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" />
              <YAxis label={y_axis_label ? { value: y_axis_label, angle: -90, position: 'insideLeft' } : undefined} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return <p className="text-muted-foreground">Unknown chart type</p>
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold mb-4">{title}</h3>
      <ChartContainer config={{}}>
        {renderChart()}
      </ChartContainer>
      {explanation && (
        <p className="mt-4 text-sm text-muted-foreground">{explanation}</p>
      )}
    </div>
  )
}
