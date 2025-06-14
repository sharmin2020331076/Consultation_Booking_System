import { type NextRequest, NextResponse } from "next/server"
import { getGridFSBucket } from "@/lib/mongodb"
import { Readable } from "stream"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const fileType = formData.get("fileType") as string // 'certificate' or 'profile'

    if (!file || !userId || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const bucket = await getGridFSBucket()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create a readable stream from buffer
    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)

    // Generate unique filename
    const filename = `${fileType}_${userId}_${Date.now()}_${file.name}`

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        userId,
        fileType,
        originalName: file.name,
        contentType: file.type,
        uploadDate: new Date(),
      },
    })

    return new Promise((resolve) => {
      readableStream
        .pipe(uploadStream)
        .on("error", (error) => {
          resolve(NextResponse.json({ error: "Upload failed" }, { status: 500 }))
        })
        .on("finish", () => {
          resolve(
            NextResponse.json({
              success: true,
              fileId: uploadStream.id.toString(),
              filename: filename,
              url: `/api/files/${uploadStream.id.toString()}`,
            }),
          )
        })
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
