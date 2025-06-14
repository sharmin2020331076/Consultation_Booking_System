import { type NextRequest, NextResponse } from "next/server"
import { getGridFSBucket } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params

    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 })
    }

    const bucket = await getGridFSBucket()
    const objectId = new ObjectId(fileId)

    // Check if file exists
    const files = await bucket.find({ _id: objectId }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStream(objectId)

    // Convert stream to buffer
    const chunks: Buffer[] = []

    return new Promise((resolve) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)

        resolve(
          new NextResponse(buffer, {
            headers: {
              "Content-Type": file.metadata?.contentType || "application/octet-stream",
              "Content-Length": buffer.length.toString(),
              "Cache-Control": "public, max-age=31536000",
            },
          }),
        )
      })

      downloadStream.on("error", () => {
        resolve(NextResponse.json({ error: "File download failed" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "File download failed" }, { status: 500 })
  }
}

