"use client"

import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Calendar, CheckCircle } from "lucide-react"

export default function ConsultantPendingPage() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">ConsultBook</span>
          </div>
          <div className="bg-orange-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Application Under Review</CardTitle>
          <CardDescription>Your consultant application is being reviewed by our admin team</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Application submitted</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm">Under admin review</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-500">Approval pending</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              We'll review your credentials and certificates. You'll receive an email notification once your application
              is approved.
            </p>
          </div>

          <Button onClick={handleLogout} variant="outline" className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
