import { type NextRequest, NextResponse } from "next/server"
import { getGridFSBucket } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get("type") // 'certificate' or 'profile'

    const bucket = await getGridFSBucket()

    const query: any = { "metadata.userId": userId }
    if (fileType) {
      query["metadata.fileType"] = fileType
    }

    const files = await bucket.find(query).toArray()

    const fileList = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      originalName: file.metadata?.originalName,
      contentType: file.metadata?.contentType,
      fileType: file.metadata?.fileType,
      uploadDate: file.metadata?.uploadDate,
      url: `/api/files/${file._id.toString()}`,
    }))

    return NextResponse.json({ files: fileList })
  } catch (error) {
    console.error("Error fetching user files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

