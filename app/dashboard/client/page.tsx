"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Clock, User, Search, LogOut, Plus, Star, MessageCircle, X, CalendarX, Settings } from "lucide-react"
import Link from "next/link"

interface Appointment {
  id: string
  consultantId: string
  consultantName: string
  consultantSpecialty: string
  consultantEmail: string
  clientName: string
  clientEmail: string
  clientPhone: string
  date: string
  time: string
  duration: number
  status: "upcoming" | "completed" | "cancelled"
  mode: "in-person" | "virtual" | "phone"
  amount: number
  notes?: string
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  reviewed?: boolean
  reviewedAt?: string
}

interface ReviewData {
  rating: number
  comment: string
}

interface RescheduleData {
  newDate: string
  newTime: string
  reason: string
}

export default function ClientDashboard() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [reviewData, setReviewData] = useState<ReviewData>({ rating: 5, comment: "" })
  const [rescheduleData, setRescheduleData] = useState<RescheduleData>({ newDate: "", newTime: "", reason: "" })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

  // Add state for unread messages
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Add function to fetch unread message count
  const fetchUnreadMessages = async () => {
    try {
      const conversationsRef = collection(db, "conversations")
      const q = query(conversationsRef, where("clientId", "==", user?.uid))
      const querySnapshot = await getDocs(q)

      let totalUnread = 0
      querySnapshot.forEach((doc) => {
        const conversation = doc.data()
        totalUnread += conversation.clientUnread || 0
      })

      setUnreadMessages(totalUnread)
    } catch (error) {
      console.error("Error fetching unread messages:", error)
    }
  }

  // Call fetchUnreadMessages in useEffect
  useEffect(() => {
    if (!loading && (!user || userData?.role !== "client")) {
      router.push("/login")
      return
    }

    if (user) {
      fetchAppointments()
      fetchUnreadMessages()
    }
  }, [user, userData, loading, router])

  const fetchAppointments = async () => {
    try {
      const appointmentsRef = collection(db, "appointments")
      const q = query(appointmentsRef, where("clientId", "==", user?.uid))
      const querySnapshot = await getDocs(q)

      const appointmentsList: Appointment[] = []
      querySnapshot.forEach((doc) => {
        appointmentsList.push({ id: doc.id, ...doc.data() } as Appointment)
      })

      // Sort by date in JavaScript instead of Firestore
      appointmentsList.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`)
        const dateB = new Date(`${b.date}T${b.time}`)
        return dateB.getTime() - dateA.getTime()
      })

      setAppointments(appointmentsList)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return

    setProcessingAction(true)
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: "client",
      })

      // Add notification for consultant
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedAppointment?.consultantId,
        recipientType: "consultant",
        type: "appointment_cancelled",
        title: "Appointment Cancelled",
        message: `${userData?.name} has cancelled the appointment scheduled for ${selectedAppointment?.date} at ${selectedAppointment?.time}`,
        appointmentId: appointmentId,
        createdAt: new Date().toISOString(),
        read: false,
      })

      // Update local state
      setAppointments(
        appointments.map((apt) => (apt.id === appointmentId ? { ...apt, status: "cancelled" as const } : apt)),
      )

      alert("Appointment cancelled successfully!")
      setSelectedAppointment(null)
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      alert("Error cancelling appointment. Please try again.")
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRescheduleAppointment = async () => {
    if (!rescheduleData.newDate || !rescheduleData.newTime || !rescheduleData.reason.trim()) {
      alert("Please fill in all fields!")
      return
    }

    setProcessingAction(true)
    try {
      await updateDoc(doc(db, "appointments", selectedAppointment!.id), {
        date: rescheduleData.newDate,
        time: rescheduleData.newTime,
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: "client",
        rescheduleReason: rescheduleData.reason,
      })

      // Add notification for consultant
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedAppointment?.consultantId,
        recipientType: "consultant",
        type: "appointment_rescheduled",
        title: "Appointment Rescheduled",
        message: `${userData?.name} has rescheduled the appointment to ${rescheduleData.newDate} at ${rescheduleData.newTime}. Reason: ${rescheduleData.reason}`,
        appointmentId: selectedAppointment!.id,
        createdAt: new Date().toISOString(),
        read: false,
      })

      // Update local state
      setAppointments(
        appointments.map((apt) =>
          apt.id === selectedAppointment!.id
            ? { ...apt, date: rescheduleData.newDate, time: rescheduleData.newTime }
            : apt,
        ),
      )

      alert("Appointment rescheduled successfully!")
      setSelectedAppointment(null)
      setRescheduleData({ newDate: "", newTime: "", reason: "" })
    } catch (error) {
      console.error("Error rescheduling appointment:", error)
      alert("Error rescheduling appointment. Please try again.")
    } finally {
      setProcessingAction(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedAppointment || !reviewData.comment.trim()) {
      alert("Please provide a rating and comment!")
      return
    }

    setSubmittingReview(true)
    try {
      // Add review to reviews collection
      await addDoc(collection(db, "reviews"), {
        appointmentId: selectedAppointment.id,
        consultantId: selectedAppointment.consultantId,
        clientId: user!.uid,
        clientName: userData!.name,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date().toISOString(),
      })

      // Update appointment to mark as reviewed
      await updateDoc(doc(db, "appointments", selectedAppointment.id), {
        reviewed: true,
        reviewedAt: new Date().toISOString(),
      })

      // Update local state
      setAppointments(appointments.map((apt) => (apt.id === selectedAppointment.id ? { ...apt, reviewed: true } : apt)))

      alert("Review submitted successfully!")
      setSelectedAppointment(null)
      setReviewData({ rating: 5, comment: "" })
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("Error submitting review. Please try again.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const upcomingAppointments = appointments.filter((apt) => apt.status === "upcoming")
  const pastAppointments = appointments.filter((apt) => apt.status === "completed")

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
              <span className="ml-2 text-2xl font-bold text-gray-900">ConsultBook</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/messages">
                <Button variant="outline" size="sm" className="relative">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                  {unreadMessages > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0">
                      {unreadMessages}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Profile Section with Photo */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                  {userData?.profilePhoto ? (
                    <img
                      src={userData.profilePhoto || "/placeholder.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <span className="text-gray-700">Welcome, {userData?.name}</span>
                <Link href="/client/profile">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
              </div>

              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Client Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/book-consultant">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Search className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg">Find Consultants</h3>
                    <p className="text-gray-600">Search and book appointments</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/book-consultant">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Plus className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg">Book Appointment</h3>
                    <p className="text-gray-600">Schedule a new consultation</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastAppointments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="text-center py-4">Loading appointments...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming appointments</p>
                <Link href="/book-consultant">
                  <Button className="mt-4">Book Your First Consultation</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{appointment.consultantName}</h4>
                        <p className="text-sm text-gray-600">{appointment.consultantSpecialty}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{appointment.mode}</Badge>
                          <span className="text-sm text-gray-500">
                            {appointment.date} at {appointment.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">৳{appointment.amount}</p>
                      <div className="flex space-x-2 mt-2">
                        {/* View Details Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Appointment Details</DialogTitle>
                              <DialogDescription>
                                Consultation with Dr. {selectedAppointment?.consultantName}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedAppointment && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Consultant</Label>
                                    <p className="text-sm text-gray-600">Dr. {selectedAppointment.consultantName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Specialty</Label>
                                    <p className="text-sm text-gray-600">{selectedAppointment.consultantSpecialty}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Date & Time</Label>
                                    <p className="text-sm text-gray-600">
                                      {selectedAppointment.date} at {selectedAppointment.time}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Duration</Label>
                                    <p className="text-sm text-gray-600">{selectedAppointment.duration} minutes</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Mode</Label>
                                    <p className="text-sm text-gray-600 capitalize">
                                      {selectedAppointment.mode.replace("-", " ")}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Amount</Label>
                                    <p className="text-sm text-gray-600">৳{selectedAppointment.amount}</p>
                                  </div>
                                </div>

                                {selectedAppointment.notes && (
                                  <div>
                                    <Label className="text-sm font-medium">Notes</Label>
                                    <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {selectedAppointment.status}
                                  </Badge>
                                  <Badge variant="outline">{selectedAppointment.paymentStatus}</Badge>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2 pt-4 border-t">
                                  <Link href={`/messages?consultantId=${selectedAppointment.consultantId}`}>
                                    <Button variant="outline" size="sm">
                                      <MessageCircle className="h-4 w-4 mr-2" />
                                      Message
                                    </Button>
                                  </Link>

                                  {/* Reschedule Dialog */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <CalendarX className="h-4 w-4 mr-2" />
                                        Reschedule
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Reschedule Appointment</DialogTitle>
                                        <DialogDescription>
                                          Choose a new date and time for your appointment
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="newDate">New Date</Label>
                                          <Input
                                            id="newDate"
                                            type="date"
                                            value={rescheduleData.newDate}
                                            onChange={(e) =>
                                              setRescheduleData({ ...rescheduleData, newDate: e.target.value })
                                            }
                                            min={new Date().toISOString().split("T")[0]}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="newTime">New Time</Label>
                                          <Input
                                            id="newTime"
                                            type="time"
                                            value={rescheduleData.newTime}
                                            onChange={(e) =>
                                              setRescheduleData({ ...rescheduleData, newTime: e.target.value })
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="reason">Reason for Rescheduling</Label>
                                          <Textarea
                                            id="reason"
                                            value={rescheduleData.reason}
                                            onChange={(e) =>
                                              setRescheduleData({ ...rescheduleData, reason: e.target.value })
                                            }
                                            placeholder="Please provide a reason..."
                                            rows={3}
                                          />
                                        </div>
                                        <Button
                                          onClick={handleRescheduleAppointment}
                                          disabled={processingAction}
                                          className="w-full"
                                        >
                                          {processingAction ? "Rescheduling..." : "Reschedule Appointment"}
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                                    disabled={processingAction}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    {processingAction ? "Cancelling..." : "Cancel"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultation History */}
        <Card>
          <CardHeader>
            <CardTitle>Consultation History</CardTitle>
            <CardDescription>Your past consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {pastAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No consultation history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{appointment.consultantName}</h4>
                        <p className="text-sm text-gray-600">{appointment.consultantSpecialty}</p>
                        <span className="text-sm text-gray-500">
                          {appointment.date} at {appointment.time}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Completed</Badge>
                      <div className="flex space-x-2 mt-2">
                        {(appointment as any).reviewed ? (
                          <Badge variant="outline" className="text-green-600">
                            Reviewed
                          </Badge>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                                <Star className="h-4 w-4 mr-1" />
                                Rate & Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Rate & Review</DialogTitle>
                                <DialogDescription>
                                  Share your experience with Dr. {selectedAppointment?.consultantName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">Rating</Label>
                                  <div className="flex space-x-1 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                                        className={`p-1 ${
                                          star <= reviewData.rating ? "text-yellow-400" : "text-gray-300"
                                        }`}
                                      >
                                        <Star className="h-6 w-6 fill-current" />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="comment">Comment</Label>
                                  <Textarea
                                    id="comment"
                                    value={reviewData.comment}
                                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                    placeholder="Share your experience..."
                                    rows={4}
                                  />
                                </div>

                                <Button onClick={handleSubmitReview} disabled={submittingReview} className="w-full">
                                  {submittingReview ? "Submitting..." : "Submit Review"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
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

