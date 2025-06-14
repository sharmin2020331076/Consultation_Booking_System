"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Database, Users, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface TestAppointment {
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  consultantId: string
  consultantName: string
  consultantEmail: string
  consultantSpecialty: string
  date: string
  time: string
  duration: number
  mode: "in-person" | "virtual" | "phone"
  amount: number
  notes: string
  paymentMethod: string
  paymentStatus: "completed"
  status: "completed"
  createdAt: string
  completedAt: string
}

export default function TestDataPage() {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateTestData = async () => {
    setGenerating(true)
    try {
      // Check admin access
      const adminSession = localStorage.getItem("adminSession")
      if (!adminSession) {
        alert("Admin access required!")
        router.push("/login")
        return
      }

      // Fetch existing users
      const usersRef = collection(db, "users")
      const clientsQuery = query(usersRef, where("role", "==", "client"))
      const consultantsQuery = query(usersRef, where("role", "==", "consultant"), where("approved", "==", true))

      const [clientsSnapshot, consultantsSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(consultantsQuery),
      ])

      const clients: any[] = []
      const consultants: any[] = []

      clientsSnapshot.forEach((doc) => clients.push(doc.data()))
      consultantsSnapshot.forEach((doc) => consultants.push(doc.data()))

      if (clients.length === 0 || consultants.length === 0) {
        alert("Need at least one client and one approved consultant to generate test data!")
        return
      }

      // Generate test appointments
      const testAppointments: TestAppointment[] = []
      const modes: ("in-person" | "virtual" | "phone")[] = ["in-person", "virtual", "phone"]
      const paymentMethods = ["bkash", "nagad", "rocket", "card", "cash"]

      // Generate 15 completed appointments
      for (let i = 0; i < 15; i++) {
        const client = clients[Math.floor(Math.random() * clients.length)]
        const consultant = consultants[Math.floor(Math.random() * consultants.length)]
        const mode = modes[Math.floor(Math.random() * modes.length)]
        const duration = [30, 60, 90, 120][Math.floor(Math.random() * 4)]
        const hourlyRate = Math.floor(Math.random() * 2000) + 1000 // 1000-3000 taka
        const amount = (hourlyRate * duration) / 60

        // Generate dates from 1-30 days ago
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const appointmentDate = new Date()
        appointmentDate.setDate(appointmentDate.getDate() - daysAgo)
        const dateString = appointmentDate.toISOString().split("T")[0]

        // Generate random time
        const hours = Math.floor(Math.random() * 10) + 9 // 9 AM to 6 PM
        const minutes = Math.random() < 0.5 ? "00" : "30"
        const timeString = `${hours.toString().padStart(2, "0")}:${minutes}`

        const testAppointment: TestAppointment = {
          clientId: client.uid,
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone || "+8801234567890",
          consultantId: consultant.uid,
          consultantName: consultant.name,
          consultantEmail: consultant.email,
          consultantSpecialty: consultant.specialty,
          date: dateString,
          time: timeString,
          duration: duration,
          mode: mode,
          amount: Math.round(amount),
          notes: `Test consultation session ${i + 1}. This is a generated appointment for testing purposes.`,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          paymentStatus: "completed",
          status: "completed",
          createdAt: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Created 1 day before appointment
          completedAt: new Date(appointmentDate.getTime() + duration * 60 * 1000).toISOString(), // Completed after duration
        }

        testAppointments.push(testAppointment)
      }

      // Add appointments to Firestore
      const appointmentsRef = collection(db, "appointments")
      for (const appointment of testAppointments) {
        await addDoc(appointmentsRef, appointment)
      }

      setGenerated(true)
      alert(`Successfully generated ${testAppointments.length} test appointments!`)
    } catch (error) {
      console.error("Error generating test data:", error)
      alert("Error generating test data. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Test Data Generator</span>
              </div>
            </div>
            <span className="text-gray-700">Admin Panel</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate Test Data</h1>
          <p className="text-gray-600">Create sample completed appointments for testing the review and rating system</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Test Appointments</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">Completed appointments will be created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Date Range</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">30 Days</div>
              <p className="text-xs text-muted-foreground">Random dates from past 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Random Data</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Mixed</div>
              <p className="text-xs text-muted-foreground">Random clients, consultants, times</p>
            </CardContent>
          </Card>
        </div>

        {/* Generation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Test Appointments</CardTitle>
            <CardDescription>
              This will create 15 completed appointments with random data for testing the review and rating system. Make
              sure you have at least one client and one approved consultant in the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">What will be generated:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 15 completed appointments with random dates (past 30 days)</li>
                <li>• Random client-consultant pairings from existing users</li>
                <li>• Various consultation modes (in-person, virtual, phone)</li>
                <li>• Random durations (30, 60, 90, 120 minutes)</li>
                <li>• Random payment amounts based on duration</li>
                <li>• All appointments marked as "completed" status</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">After generation, you can:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Test the review and rating system from client dashboard</li>
                <li>• View completed appointments in both dashboards</li>
                <li>• See earnings calculations for consultants</li>
                <li>• Test the rating display in consultant profiles</li>
              </ul>
            </div>

            {generated && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Test data generated successfully!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You can now test the review system by logging in as a client and viewing completed appointments.
                </p>
              </div>
            )}

            <Button onClick={generateTestData} disabled={generating} className="w-full" size="lg">
              {generating ? "Generating Test Data..." : "Generate Test Appointments"}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Generate Test Data</h4>
                <p className="text-sm text-gray-600">Click the button above to create test appointments</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Test Reviews as Client</h4>
                <p className="text-sm text-gray-600">
                  Login as a client → Go to dashboard → View "Consultation History" → Click "Rate & Review" on completed
                  appointments
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Test Rating Display</h4>
                <p className="text-sm text-gray-600">
                  After adding reviews → Go to "Find Consultants" → View consultant profiles to see ratings and reviews
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">4. Test Consultant Earnings</h4>
                <p className="text-sm text-gray-600">
                  Login as consultant → View dashboard to see updated earnings from completed appointments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
