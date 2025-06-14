"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText, ImageIcon } from "lucide-react"

interface FileUploadProps {
  userId: string
  fileType: "certificate" | "profile"
  onUploadComplete?: (files: UploadedFile[]) => void
  multiple?: boolean
  accept?: string
  maxSize?: number // in MB
}

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
  contentType: string
}

export default function FileUpload({
  userId,
  fileType,
  onUploadComplete,
  multiple = false,
  accept = "image/*,.pdf",
  maxSize = 10,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    setUploading(true)
    const newUploadedFiles: UploadedFile[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("userId", userId)
        formData.append("fileType", fileType)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          newUploadedFiles.push({
            id: result.fileId,
            filename: result.filename,
            originalName: file.name,
            url: result.url,
            contentType: file.type,
          })
        } else {
          const error = await response.json()
          alert(`Failed to upload ${file.name}: ${error.error}`)
        }
      }

      const allFiles = [...uploadedFiles, ...newUploadedFiles]
      setUploadedFiles(allFiles)
      onUploadComplete?.(allFiles)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = (fileId: string) => {
    const filtered = uploadedFiles.filter((f) => f.id !== fileId)
    setUploadedFiles(filtered)
    onUploadComplete?.(filtered)
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <Label htmlFor={`file-upload-${fileType}`} className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-500">{uploading ? "Uploading..." : "Click to upload"}</span>
            <span className="text-gray-500"> or drag and drop</span>
          </Label>
          <Input
            id={`file-upload-${fileType}`}
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500">
            {fileType === "profile" ? "PNG, JPG up to" : "PDF, PNG, JPG up to"} {maxSize}MB
            {multiple && " each"}
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files:</Label>
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getFileIcon(file.contentType)}
                <div>
                  <p className="text-sm font-medium">{file.originalName}</p>
                  <p className="text-xs text-gray-500">{file.contentType}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => window.open(file.url, "_blank")}>
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => removeFile(file.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
