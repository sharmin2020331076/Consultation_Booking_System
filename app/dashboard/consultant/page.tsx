"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { collection, query, where, getDocs, doc, setDoc, updateDoc, addDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Clock, User, Settings, LogOut, DollarSign, MessageCircle, Bell, CalendarX, X } from "lucide-react"
import Link from "next/link"

interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  date: string
  time: string
  status: "upcoming" | "completed" | "cancelled"
  mode: "in-person" | "virtual" | "phone"
  amount: number
  notes?: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  appointmentId?: string
  createdAt: string
  read: boolean
}

interface RescheduleData {
  newDate: string
  newTime: string
  reason: string
}

export default function ConsultantDashboard() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [processingAction, setProcessingAction] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData>({ newDate: "", newTime: "", reason: "" })
  // Add state for unread messages
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Add function to fetch unread message count
  const fetchUnreadMessages = async () => {
    try {
      const conversationsRef = collection(db, "conversations")
      const q = query(conversationsRef, where("consultantId", "==", user?.uid))
      const querySnapshot = await getDocs(q)

      let totalUnread = 0
      querySnapshot.forEach((doc) => {
        const conversation = doc.data()
        totalUnread += conversation.consultantUnread || 0
      })

      setUnreadMessages(totalUnread)
    } catch (error) {
      console.error("Error fetching unread messages:", error)
    }
  }

  useEffect(() => {
    if (!loading && (!user || userData?.role !== "consultant")) {
      router.push("/login")
      return
    }

    if (!loading && userData?.role === "consultant" && !userData?.approved) {
      router.push("/consultant-pending")
      return
    }

    // Call fetchUnreadMessages in useEffect
    if (user) {
      fetchAppointments()
      fetchNotifications()
      fetchUnreadMessages()
    }
  }, [user, userData, loading, router])

  const fetchAppointments = async () => {
    try {
      const appointmentsRef = collection(db, "appointments")
      // Use simple query to avoid index issues
      const q = query(appointmentsRef, where("consultantId", "==", user?.uid))
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

  const fetchNotifications = async () => {
    try {
      const notificationsRef = collection(db, "notifications")
      const q = query(notificationsRef, where("recipientId", "==", user?.uid))
      const querySnapshot = await getDocs(q)

      const notificationsList: Notification[] = []
      querySnapshot.forEach((doc) => {
        notificationsList.push({ id: doc.id, ...doc.data() } as Notification)
      })

      // Sort by date
      notificationsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setNotifications(notificationsList)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const handleAvailabilityToggle = async (available: boolean) => {
    try {
      if (user) {
        // Use setDoc with merge to update or create the user document
        await setDoc(
          doc(db, "users", user.uid),
          {
            available: available,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
        setIsAvailable(available)
      }
    } catch (error) {
      console.error("Error updating availability:", error)
      alert(`Error updating availability: ${error instanceof Error ? error.message : "Unknown error"}`)
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

  const handleCancelAppointment = async (appointmentId: string, appointment: Appointment) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return

    setProcessingAction(true)
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: "consultant",
      })

      // Add notification for client
      await addDoc(collection(db, "notifications"), {
        recipientId: appointment.clientId,
        recipientType: "client",
        type: "appointment_cancelled",
        title: "Appointment Cancelled",
        message: `Dr. ${userData?.name} has cancelled your appointment scheduled for ${appointment.date} at ${appointment.time}`,
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
        rescheduledBy: "consultant",
        rescheduleReason: rescheduleData.reason,
      })

      // Add notification for client
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedAppointment!.clientId,
        recipientType: "client",
        type: "appointment_rescheduled",
        title: "Appointment Rescheduled",
        message: `Dr. ${userData?.name} has rescheduled your appointment to ${rescheduleData.newDate} at ${rescheduleData.newTime}. Reason: ${rescheduleData.reason}`,
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

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: new Date().toISOString(),
      })

      setNotifications(notifications.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const upcomingAppointments = appointments.filter((apt) => apt.status === "upcoming")
  const completedAppointments = appointments.filter((apt) => apt.status === "completed")
  const totalEarnings = completedAppointments.reduce((sum, apt) => sum + apt.amount, 0)
  const unreadNotifications = notifications.filter((notif) => !notif.read)

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
              {/* Update the Messages button in header */}
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

              {/* Notifications */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {unreadNotifications.length > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0">
                        {unreadNotifications.length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Notifications</DialogTitle>
                    <DialogDescription>Recent updates and alerts</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border rounded-lg cursor-pointer ${
                            !notification.read ? "bg-blue-50 border-blue-200" : "bg-gray-50"
                          }`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <span className="text-gray-700">Dr. {userData?.name}</span>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Consultant Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/consultant/profile">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Settings className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg">Manage Profile</h3>
                    <p className="text-gray-600">Update your information</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/consultant/schedule">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Calendar className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg">Manage Schedule</h3>
                    <p className="text-gray-600">Set availability & time slots</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-lg">Availability</h3>
                    <p className="text-gray-600">Currently {isAvailable ? "Available" : "Unavailable"}</p>
                  </div>
                </div>
                <Switch checked={isAvailable} onCheckedChange={handleAvailabilityToggle} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <div className="text-2xl font-bold">{completedAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{totalEarnings}</div>
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
                        <h4 className="font-semibold">{appointment.clientName}</h4>
                        <p className="text-sm text-gray-600">{appointment.clientEmail}</p>
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
                        <Link href={`/messages?clientId=${appointment.clientId}`}>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                        </Link>

                        {/* Reschedule Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAppointment(appointment)}
                              disabled={processingAction}
                            >
                              <CalendarX className="h-4 w-4 mr-1" />
                              Reschedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reschedule Appointment</DialogTitle>
                              <DialogDescription>
                                Choose a new date and time for the appointment with {selectedAppointment?.clientName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="newDate">New Date</Label>
                                <Input
                                  id="newDate"
                                  type="date"
                                  value={rescheduleData.newDate}
                                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                                  min={new Date().toISOString().split("T")[0]}
                                />
                              </div>
                              <div>
                                <Label htmlFor="newTime">New Time</Label>
                                <Input
                                  id="newTime"
                                  type="time"
                                  value={rescheduleData.newTime}
                                  onChange={(e) => setRescheduleData({ ...rescheduleData, newTime: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="reason">Reason for Rescheduling</Label>
                                <Textarea
                                  id="reason"
                                  value={rescheduleData.reason}
                                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
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
                          onClick={() => handleCancelAppointment(appointment.id, appointment)}
                          disabled={processingAction}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Consultations</CardTitle>
            <CardDescription>Your completed sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {completedAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No completed consultations yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{appointment.clientName}</h4>
                        <span className="text-sm text-gray-500">
                          {appointment.date} at {appointment.time}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Completed</Badge>
                      <p className="text-sm text-gray-600 mt-1">৳{appointment.amount}</p>
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

