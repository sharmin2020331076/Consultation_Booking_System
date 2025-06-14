"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, User, MapPin, DollarSign, Clock, CreditCard } from "lucide-react"
import Link from "next/link"

interface ConsultantProfile {
  consultantId: string
  consultantName: string
  consultantEmail: string
  specialty: string
  bio: string
  hourlyRate: number
  city: string
  experience: string
  languages: string[]
  consultationModes: string[]
  profilePhoto?: string
}

interface BookingData {
  date: string
  time: string
  duration: number
  mode: string
  notes: string
  paymentMethod: string
}

interface ScheduleData {
  [key: string]: {
    enabled: boolean
    timeSlots: string[]
  }
}

export default function BookAppointmentPage({ params }: { params: { consultantId: string } }) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [consultant, setConsultant] = useState<ConsultantProfile | null>(null)
  const [consultantSchedule, setConsultantSchedule] = useState<ScheduleData>({})
  const [loadingConsultant, setLoadingConsultant] = useState(true)
  const [consultantId, setConsultantId] = useState<string>("")
  const [booking, setBooking] = useState<BookingData>({
    date: "",
    time: "",
    duration: 60,
    mode: "",
    notes: "",
    paymentMethod: "",
  })
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Handle params properly for Next.js 15
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params)
      setConsultantId(resolvedParams.consultantId)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!loading && (!user || userData?.role !== "client")) {
      router.push("/login")
      return
    }

    if (consultantId) {
      fetchConsultant()
      fetchConsultantSchedule()
      fetchBookedSlots()
    }
  }, [user, userData, loading, consultantId, router])

  const fetchConsultant = async () => {
    try {
      const consultantDoc = await getDoc(doc(db, "consultantProfiles", consultantId))
      if (consultantDoc.exists()) {
        setConsultant(consultantDoc.data() as ConsultantProfile)
      } else {
        alert("Consultant not found")
        router.push("/book-consultant")
      }
    } catch (error) {
      console.error("Error fetching consultant:", error)
    } finally {
      setLoadingConsultant(false)
    }
  }

  const fetchConsultantSchedule = async () => {
    try {
      const scheduleDoc = await getDoc(doc(db, "consultantSchedules", consultantId))
      if (scheduleDoc.exists()) {
        setConsultantSchedule(scheduleDoc.data() as ScheduleData)
      }
    } catch (error) {
      console.error("Error fetching consultant schedule:", error)
    }
  }

  const fetchBookedSlots = async () => {
    try {
      // Use simpler query to avoid index issues
      const appointmentsRef = collection(db, "appointments")
      const q = query(appointmentsRef, where("consultantId", "==", consultantId))
      const querySnapshot = await getDocs(q)

      const slots: string[] = []
      querySnapshot.forEach((doc) => {
        const appointment = doc.data()
        if (appointment.status === "upcoming") {
          slots.push(`${appointment.date}_${appointment.time}`)
        }
      })

      setBookedSlots(slots)
    } catch (error) {
      console.error("Error fetching booked slots:", error)
    }
  }

  const getDayName = (dateString: string) => {
    const date = new Date(dateString)
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return days[date.getDay()]
  }

  const generateTimeSlots = () => {
    if (!booking.date) return []

    const dayName = getDayName(booking.date)
    const daySchedule = consultantSchedule[dayName]

    // If day is not enabled or no schedule, return empty
    if (!daySchedule?.enabled) {
      return []
    }

    // Get available time slots from consultant's schedule
    const availableSlots = daySchedule.timeSlots || []

    const slots = availableSlots.map((time) => {
      const slotKey = `${booking.date}_${time}`
      const isBooked = bookedSlots.includes(slotKey)
      return { time, isBooked }
    })

    return slots
  }

  const calculateTotal = () => {
    if (!consultant) return 0
    return (consultant.hourlyRate * booking.duration) / 60
  }

  const handleSubmitBooking = async () => {
    if (!booking.date || !booking.time || !booking.mode || !booking.paymentMethod) {
      alert("Please fill in all required fields!")
      return
    }

    // Check if the selected day is available
    const dayName = getDayName(booking.date)
    const daySchedule = consultantSchedule[dayName]

    if (!daySchedule?.enabled) {
      alert("The consultant is not available on this day. Please select another date.")
      return
    }

    // Check if the selected time slot is available in consultant's schedule
    if (!daySchedule.timeSlots.includes(booking.time)) {
      alert("This time slot is not available in the consultant's schedule. Please select another time.")
      return
    }

    const slotKey = `${booking.date}_${booking.time}`
    if (bookedSlots.includes(slotKey)) {
      alert("This time slot is already booked. Please select another time.")
      return
    }

    setSubmitting(true)
    try {
      const appointmentData = {
        clientId: user!.uid,
        clientName: userData!.name,
        clientEmail: userData!.email,
        clientPhone: userData!.phone || "",
        consultantId: consultantId,
        consultantName: consultant!.consultantName,
        consultantEmail: consultant!.consultantEmail,
        consultantSpecialty: consultant!.specialty,
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        mode: booking.mode,
        notes: booking.notes,
        amount: calculateTotal(),
        paymentMethod: booking.paymentMethod,
        paymentStatus: "completed", // Mock payment
        status: "upcoming",
        createdAt: new Date().toISOString(),
        // Add these fields to avoid index issues
        dateTime: `${booking.date}T${booking.time}:00`,
        timestamp: new Date().getTime(),
      }

      await addDoc(collection(db, "appointments"), appointmentData)

      // Mock payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      alert("Appointment booked successfully!")
      router.push("/dashboard/client")
    } catch (error) {
      console.error("Error booking appointment:", error)
      alert("Error booking appointment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || loadingConsultant || !consultantId) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!consultant) {
    return <div className="flex items-center justify-center min-h-screen">Consultant not found</div>
  }

  const timeSlots = booking.date ? generateTimeSlots() : []
  const selectedDayName = booking.date ? getDayName(booking.date) : ""
  const isDayAvailable = selectedDayName ? consultantSchedule[selectedDayName]?.enabled : false

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/book-consultant">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Book Appointment</span>
              </div>
            </div>
            <span className="text-gray-700">Welcome, {userData?.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Consultant Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Consultant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 overflow-hidden">
                    {consultant.profilePhoto ? (
                      <img
                        src={consultant.profilePhoto || "/placeholder.svg"}
                        alt={consultant.consultantName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">Dr. {consultant.consultantName}</h3>
                  <p className="text-sm text-gray-600">{consultant.specialty}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{consultant.city}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span>৳{consultant.hourlyRate}/hour</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{consultant.experience}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-1">
                    {consultant.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Consultation Modes</h4>
                  <div className="flex flex-wrap gap-1">
                    {consultant.consultationModes.map((mode) => (
                      <Badge key={mode} variant="secondary" className="text-xs">
                        {mode.replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Duration:</span>
                  <span>{booking.duration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rate:</span>
                  <span>৳{consultant.hourlyRate}/hour</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>৳{calculateTotal()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Your Appointment</CardTitle>
                <CardDescription>Fill in the details to book your consultation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="date">Select Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={booking.date}
                    onChange={(e) => setBooking({ ...booking, date: e.target.value, time: "" })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                  {booking.date && !isDayAvailable && (
                    <p className="text-sm text-red-600">
                      The consultant is not available on {selectedDayName}s. Please select another date.
                    </p>
                  )}
                </div>

                {/* Time Selection */}
                {booking.date && isDayAvailable && (
                  <div className="space-y-2">
                    <Label>Select Time *</Label>
                    {timeSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">No time slots available for this date.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {timeSlots.map(({ time, isBooked }) => (
                            <Button
                              key={time}
                              variant={booking.time === time ? "default" : "outline"}
                              size="sm"
                              disabled={isBooked}
                              onClick={() => setBooking({ ...booking, time })}
                              className={isBooked ? "bg-red-100 text-red-500 cursor-not-allowed" : ""}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Red slots are already booked</p>
                      </>
                    )}
                  </div>
                )}

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <Select
                    value={booking.duration.toString()}
                    onValueChange={(value) => setBooking({ ...booking, duration: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Consultation Mode */}
                <div className="space-y-2">
                  <Label>Consultation Mode *</Label>
                  <Select value={booking.mode} onValueChange={(value) => setBooking({ ...booking, mode: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select consultation mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultant.consultationModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode.replace("-", " ").charAt(0).toUpperCase() + mode.replace("-", " ").slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={booking.notes}
                    onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                    placeholder="Describe your concerns or what you'd like to discuss..."
                    rows={3}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select
                    value={booking.paymentMethod}
                    onValueChange={(value) => setBooking({ ...booking, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                      <SelectItem value="rocket">Rocket</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="cash">Cash (for in-person)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mock Payment Info */}
                {booking.paymentMethod && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-800">Mock Payment System</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      This is a demo system. No actual payment will be processed.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSubmitBooking}
                  disabled={submitting || !isDayAvailable || timeSlots.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? "Processing..." : `Book Appointment - ৳${calculateTotal()}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

