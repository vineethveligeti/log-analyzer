"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Search, ExternalLink } from "lucide-react"

interface AnomalyTableProps {
  anomalies: Array<{
    timestamp: string
    sourceIp: string
    destinationIp: string
    url: string
    action: string
    reason: string
    confidenceScore: number
    threatScore: number
  }>
}

export function AnomalyTable({ anomalies }: AnomalyTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredAnomalies = anomalies.filter(
    (anomaly) =>
      anomaly.sourceIp.includes(searchTerm) ||
      anomaly.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anomaly.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredAnomalies.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAnomalies = filteredAnomalies.slice(startIndex, startIndex + itemsPerPage)

  const getThreatLevel = (score: number) => {
    if (score >= 0.8) return { label: "HIGH", variant: "destructive" as const }
    if (score >= 0.6) return { label: "MEDIUM", variant: "default" as const }
    return { label: "LOW", variant: "secondary" as const }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>Anomalous Entries</span>
        </CardTitle>
        <CardDescription>
          Detailed view of all detected anomalies with confidence scores and explanations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by IP, URL, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Threat Level</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAnomalies.map((anomaly, index) => {
                const threatLevel = getThreatLevel(anomaly.threatScore)
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{formatTimestamp(anomaly.timestamp)}</TableCell>
                    <TableCell className="font-mono">{anomaly.sourceIp}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div className="flex items-center space-x-2">
                        <span className="truncate">{anomaly.url || "N/A"}</span>
                        {anomaly.url && <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{anomaly.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={threatLevel.variant}>{threatLevel.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${anomaly.confidenceScore * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{(anomaly.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-700 truncate" title={anomaly.reason}>
                        {anomaly.reason}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAnomalies.length)} of{" "}
              {filteredAnomalies.length} anomalies
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
