"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, User, FileText, CheckCircle, XCircle, Eye, LogOut, ExternalLink, Database } from "lucide-react"
import Link from "next/link"

interface Certificate {
  id: string
  filename: string
  originalName: string
  url: string
}

interface ConsultantApplication {
  uid: string
  name: string
  email: string
  phone: string
  specialty: string
  address: string
  qualifications: string
  certificates: Certificate[]
  profilePhoto?: string
  createdAt: string
  approved: boolean
}

export default function AdminDashboard() {
  const router = useRouter()
  const [applications, setApplications] = useState<ConsultantApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<ConsultantApplication | null>(null)

  useEffect(() => {
    // Check if admin is logged in
    const adminSession = localStorage.getItem("adminSession")
    if (!adminSession) {
      router.push("/login")
      return
    }

    fetchConsultantApplications()
  }, [router])

  const fetchConsultantApplications = async () => {
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("role", "==", "consultant"))
      const querySnapshot = await getDocs(q)

      const applicationsList: ConsultantApplication[] = []
      querySnapshot.forEach((doc) => {
        applicationsList.push({ ...doc.data() } as ConsultantApplication)
      })

      setApplications(applicationsList)
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveApplication = async (uid: string) => {
    try {
      // Use setDoc with merge to update the user document
      await setDoc(
        doc(db, "users", uid),
        {
          approved: true,
          approvedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      // Update local state
      setApplications(applications.map((app) => (app.uid === uid ? { ...app, approved: true } : app)))

      alert("Consultant application approved successfully!")
    } catch (error) {
      console.error("Error approving application:", error)
      alert(`Error approving application: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleRejectApplication = async (uid: string) => {
    try {
      await deleteDoc(doc(db, "users", uid))

      // Update local state
      setApplications(applications.filter((app) => app.uid !== uid))

      alert("Consultant application rejected and removed.")
    } catch (error) {
      console.error("Error rejecting application:", error)
      alert(`Error rejecting application: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminSession")
    router.push("/")
  }

  const pendingApplications = applications.filter((app) => !app.approved)
  const approvedConsultants = applications.filter((app) => app.approved)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">ConsultBook Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Admin Panel</span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Consultants</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedConsultants.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Test Data Link */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Development Tools</CardTitle>
              <CardDescription>Tools for testing and development</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/test-data">
                <Button variant="outline" className="mr-4">
                  <Database className="h-4 w-4 mr-2" />
                  Generate Test Data
                </Button>
              </Link>
              <span className="text-sm text-gray-600">Create sample completed appointments for testing reviews</span>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Consultant Applications</CardTitle>
            <CardDescription>Review and approve consultant registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApplications.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map((application) => (
                  <div key={application.uid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{application.name}</h4>
                        <p className="text-sm text-gray-600">{application.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{application.specialty}</Badge>
                          <span className="text-sm text-gray-500">{application.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Dr. {selectedApplication?.name}</DialogTitle>
                            <DialogDescription>{selectedApplication?.specialty}</DialogDescription>
                          </DialogHeader>
                          {selectedApplication && (
                            <div className="space-y-4">
                              {/* Profile Photo */}
                              {selectedApplication.profilePhoto && (
                                <div className="text-center">
                                  <img
                                    src={selectedApplication.profilePhoto || "/placeholder.svg"}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full mx-auto object-cover"
                                  />
                                </div>
                              )}

                              {/* Basic Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Name</label>
                                  <p className="text-sm text-gray-600">{selectedApplication.name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Email</label>
                                  <p className="text-sm text-gray-600">{selectedApplication.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Phone</label>
                                  <p className="text-sm text-gray-600">{selectedApplication.phone}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Specialty</label>
                                  <p className="text-sm text-gray-600">{selectedApplication.specialty}</p>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Address</label>
                                <p className="text-sm text-gray-600">{selectedApplication.address}</p>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Qualifications</label>
                                <p className="text-sm text-gray-600">{selectedApplication.qualifications}</p>
                              </div>

                              {/* Certificates */}
                              <div>
                                <label className="text-sm font-medium">Certificates</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  {selectedApplication.certificates?.map((cert, index) => (
                                    <div key={cert.id} className="border rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">{cert.originalName}</p>
                                          <p className="text-xs text-gray-500">Certificate {index + 1}</p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(cert.url, "_blank")}
                                        >
                                          <ExternalLink className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      </div>
                                    </div>
                                  )) || <p className="text-sm text-gray-500">No certificates uploaded</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        onClick={() => handleApproveApplication(application.uid)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>

                      <Button variant="destructive" size="sm" onClick={() => handleRejectApplication(application.uid)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Consultants */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Consultants</CardTitle>
            <CardDescription>Currently active consultants on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {approvedConsultants.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No approved consultants yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedConsultants.map((consultant) => (
                  <div key={consultant.uid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{consultant.name}</h4>
                        <p className="text-sm text-gray-600">{consultant.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary">{consultant.specialty}</Badge>
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Approved on {new Date(consultant.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
