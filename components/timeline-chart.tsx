"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts"
import { Clock, Activity } from "lucide-react"

interface TimelineChartProps {
  timeline: Array<{
    hour: string
    count: number
    anomalies: number
  }>
}

const chartConfig = {
  count: {
    label: "Total Requests",
    color: "hsl(var(--chart-1))",
  },
  anomalies: {
    label: "Anomalies",
    color: "hsl(var(--chart-2))",
  },
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  const totalRequests = timeline.reduce((sum, item) => sum + item.count, 0)
  const totalAnomalies = timeline.reduce((sum, item) => sum + item.anomalies, 0)
  const peakHour = timeline.reduce((max, item) => (item.count > max.count ? item : max), timeline[0])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{peakHour?.hour || "N/A"}</p>
                <p className="text-sm text-gray-600">Peak Hour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{totalAnomalies}</p>
                <p className="text-sm text-gray-600">Total Anomalies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Hourly breakdown of requests and detected anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} name="Total Requests" />
                <Bar dataKey="anomalies" fill="var(--color-anomalies)" radius={[4, 4, 0, 0]} name="Anomalies" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Anomaly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Trend</CardTitle>
          <CardDescription>Trend line showing anomaly detection over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="anomalies"
                  stroke="var(--color-anomalies)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-anomalies)", strokeWidth: 2, r: 4 }}
                  name="Anomalies"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
