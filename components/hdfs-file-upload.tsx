"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, X, Database } from "lucide-react"

interface HDFSFileUploadProps {
  onFileUpload: (file: File) => void
  isLoading: boolean
}

export function HDFSFileUpload({ onFileUpload, isLoading }: HDFSFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt", ".log"],
    },
    maxFiles: 1,
    disabled: isLoading,
  })

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <CardContent className="pt-6">
          <div {...getRootProps()} className="text-center py-8">
            <input {...getInputProps()} />
            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">Drop the HDFS log file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag & drop an HDFS log file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV format with HDFS structured logs
                  (LineId,Date,Time,Pid,Level,Component,Content,EventId,EventTemplate)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleRemoveFile} disabled={isLoading}>
                  <X className="h-4 w-4" />
                </Button>
                <Button onClick={handleUpload} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? "Processing..." : "Upload & Analyze"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
