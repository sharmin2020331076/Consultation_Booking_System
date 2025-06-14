"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, Clock, Save } from "lucide-react"
import Link from "next/link"

interface ScheduleData {
  [key: string]: {
    enabled: boolean
    timeSlots: string[]
  }
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
]

export default function ConsultantSchedulePage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [schedule, setSchedule] = useState<ScheduleData>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && (!user || userData?.role !== "consultant")) {
      router.push("/login")
      return
    }

    if (!loading && userData?.role === "consultant" && !userData?.approved) {
      router.push("/consultant-pending")
      return
    }

    if (user) {
      fetchSchedule()
    }
  }, [user, userData, loading, router])

  const fetchSchedule = async () => {
    try {
      const scheduleDoc = await getDoc(doc(db, "consultantSchedules", user!.uid))
      if (scheduleDoc.exists()) {
        setSchedule(scheduleDoc.data() as ScheduleData)
      } else {
        // Initialize default schedule
        const defaultSchedule: ScheduleData = {}
        DAYS.forEach((day) => {
          defaultSchedule[day] = {
            enabled: true,
            timeSlots: [],
          }
        })
        setSchedule(defaultSchedule)
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
    }
  }

  const handleSaveSchedule = async () => {
    if (!user) {
      alert("User not authenticated!")
      return
    }

    setSaving(true)
    try {
      const scheduleData = {
        ...schedule,
        consultantId: user.uid,
        consultantName: userData!.name,
        consultantEmail: userData!.email,
        updatedAt: new Date().toISOString(),
      }

      // Use setDoc instead of updateDoc to create document if it doesn't exist
      await setDoc(doc(db, "consultantSchedules", user.uid), scheduleData, { merge: true })

      alert("Schedule saved successfully!")
    } catch (error) {
      console.error("Error saving schedule:", error)
      alert(`Error saving schedule: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: !schedule[day]?.enabled,
      },
    })
  }

  const toggleTimeSlot = (day: string, timeSlot: string) => {
    const currentSlots = schedule[day]?.timeSlots || []
    const newSlots = currentSlots.includes(timeSlot)
      ? currentSlots.filter((slot) => slot !== timeSlot)
      : [...currentSlots, timeSlot].sort()

    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: schedule[day]?.enabled ?? true,
        timeSlots: newSlots,
      },
    })
  }

  const selectAllSlots = (day: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: true,
        timeSlots: [...TIME_SLOTS],
      },
    })
  }

  const clearAllSlots = (day: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        timeSlots: [],
      },
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/consultant">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Manage Schedule</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleSaveSchedule} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Schedule"}
              </Button>
              <span className="text-gray-700">Dr. {userData?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Schedule</h1>
          <p className="text-gray-600">Set your availability for each day of the week</p>
        </div>

        <div className="space-y-6">
          {DAYS.map((day) => (
            <Card key={day}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch checked={schedule[day]?.enabled ?? true} onCheckedChange={() => toggleDay(day)} />
                    <CardTitle className="capitalize">{day}</CardTitle>
                    {schedule[day]?.timeSlots?.length > 0 && (
                      <Badge variant="secondary">{schedule[day].timeSlots.length} slots available</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllSlots(day)}
                      disabled={!schedule[day]?.enabled}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearAllSlots(day)}
                      disabled={!schedule[day]?.enabled}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {schedule[day]?.enabled ? "Select available time slots for this day" : "This day is disabled"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schedule[day]?.enabled ? (
                  <div className="grid grid-cols-6 gap-2">
                    {TIME_SLOTS.map((timeSlot) => {
                      const isSelected = schedule[day]?.timeSlots?.includes(timeSlot) ?? false
                      return (
                        <Button
                          key={timeSlot}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTimeSlot(day, timeSlot)}
                          className="text-xs"
                        >
                          {timeSlot}
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Day is disabled. Enable to set time slots.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Schedule Notes:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Time slots are shown in 30-minute intervals</li>
            <li>• Disabled days won't show up for client booking</li>
            <li>• Changes are reflected immediately for new bookings</li>
            <li>• Existing appointments won't be affected by schedule changes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

