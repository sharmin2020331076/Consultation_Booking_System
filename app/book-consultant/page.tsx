"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Search, MapPin, DollarSign, Clock, User, Star, ArrowLeft, Filter, MessageSquare } from "lucide-react"
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
  published: boolean
  rating?: number
  reviewCount?: number
  appointmentCount?: number
}

interface Review {
  id: string
  clientName: string
  rating: number
  comment: string
  createdAt: string
}

export default function BookConsultantPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([])
  const [filteredConsultants, setFilteredConsultants] = useState<ConsultantProfile[]>([])
  const [loadingConsultants, setLoadingConsultants] = useState(true)
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantProfile | null>(null)
  const [consultantReviews, setConsultantReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [selectedCity, setSelectedCity] = useState("all")
  const [maxRate, setMaxRate] = useState("0")
  const [selectedMode, setSelectedMode] = useState("all")

  useEffect(() => {
    if (!loading && (!user || userData?.role !== "client")) {
      router.push("/login")
      return
    }

    if (user) {
      fetchConsultants()
    }
  }, [user, userData, loading, router])

  useEffect(() => {
    filterConsultants()
  }, [consultants, searchTerm, selectedSpecialty, selectedCity, maxRate, selectedMode])

  const fetchConsultants = async () => {
    try {
      const profilesRef = collection(db, "consultantProfiles")
      const q = query(profilesRef, where("published", "==", true))
      const querySnapshot = await getDocs(q)

      const consultantsList: ConsultantProfile[] = []

      for (const docSnapshot of querySnapshot.docs) {
        const consultantData = docSnapshot.data() as ConsultantProfile

        // Fetch ratings and appointment count for each consultant
        const [avgRating, reviewCount, appointmentCount] = await Promise.all([
          getConsultantRating(consultantData.consultantId),
          getReviewCount(consultantData.consultantId),
          getAppointmentCount(consultantData.consultantId),
        ])

        consultantsList.push({
          ...consultantData,
          rating: avgRating,
          reviewCount,
          appointmentCount,
        })
      }

      setConsultants(consultantsList)
    } catch (error) {
      console.error("Error fetching consultants:", error)
    } finally {
      setLoadingConsultants(false)
    }
  }

  const getConsultantRating = async (consultantId: string): Promise<number> => {
    try {
      const reviewsRef = collection(db, "reviews")
      const q = query(reviewsRef, where("consultantId", "==", consultantId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) return 0

      let totalRating = 0
      querySnapshot.forEach((doc) => {
        totalRating += doc.data().rating
      })

      return Math.round((totalRating / querySnapshot.size) * 10) / 10
    } catch (error) {
      console.error("Error fetching rating:", error)
      return 0
    }
  }

  const getReviewCount = async (consultantId: string): Promise<number> => {
    try {
      const reviewsRef = collection(db, "reviews")
      const q = query(reviewsRef, where("consultantId", "==", consultantId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.size
    } catch (error) {
      console.error("Error fetching review count:", error)
      return 0
    }
  }

  const getAppointmentCount = async (consultantId: string): Promise<number> => {
    try {
      const appointmentsRef = collection(db, "appointments")
      const q = query(appointmentsRef, where("consultantId", "==", consultantId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.size
    } catch (error) {
      console.error("Error fetching appointment count:", error)
      return 0
    }
  }

  const fetchConsultantReviews = async (consultantId: string) => {
    setLoadingReviews(true)
    try {
      const reviewsRef = collection(db, "reviews")
      const q = query(reviewsRef, where("consultantId", "==", consultantId))
      const querySnapshot = await getDocs(q)

      const reviewsList: Review[] = []
      querySnapshot.forEach((doc) => {
        reviewsList.push({ id: doc.id, ...doc.data() } as Review)
      })

      // Sort by date
      reviewsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setConsultantReviews(reviewsList)
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const filterConsultants = () => {
    let filtered = consultants

    if (searchTerm) {
      filtered = filtered.filter(
        (consultant) =>
          consultant.consultantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          consultant.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          consultant.bio.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedSpecialty !== "all") {
      filtered = filtered.filter((consultant) => consultant.specialty === selectedSpecialty)
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter((consultant) => consultant.city.toLowerCase().includes(selectedCity.toLowerCase()))
    }

    if (maxRate !== "0") {
      filtered = filtered.filter((consultant) => consultant.hourlyRate <= Number.parseInt(maxRate))
    }

    if (selectedMode !== "all") {
      filtered = filtered.filter((consultant) => consultant.consultationModes.includes(selectedMode))
    }

    setFilteredConsultants(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSpecialty("all")
    setSelectedCity("all")
    setMaxRate("0")
    setSelectedMode("all")
  }

  const handleViewProfile = async (consultant: ConsultantProfile) => {
    setSelectedConsultant(consultant)
    await fetchConsultantReviews(consultant.consultantId)
  }

  const specialties = [...new Set(consultants.map((c) => c.specialty))]
  const cities = [...new Set(consultants.map((c) => c.city))]

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
              <Link href="/dashboard/client">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Find Consultants</span>
              </div>
            </div>
            <span className="text-gray-700">Welcome, {userData?.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search consultants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All specialties</SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRate">Max Rate (৳/hour)</Label>
                  <Input
                    id="maxRate"
                    type="number"
                    placeholder="Any rate"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Consultation Mode</Label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any mode</SelectItem>
                      <SelectItem value="in-person">In-person</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Consultants List */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Consultants</h2>
              <p className="text-gray-600">
                {loadingConsultants ? "Loading..." : `${filteredConsultants.length} consultants found`}
              </p>
            </div>

            {loadingConsultants ? (
              <div className="text-center py-8">Loading consultants...</div>
            ) : filteredConsultants.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No consultants found matching your criteria</p>
                  <Button onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredConsultants.map((consultant) => (
                  <Card key={consultant.consultantId} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">Dr. {consultant.consultantName}</h3>
                              <p className="text-sm text-gray-600">{consultant.specialty}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg">৳{consultant.hourlyRate}/hr</p>
                              {consultant.rating && consultant.rating > 0 ? (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                  <span className="text-sm ml-1">
                                    {consultant.rating} ({consultant.reviewCount || 0})
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-gray-300" />
                                  <span className="text-sm ml-1 text-gray-500">No reviews yet</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-1" />
                              {consultant.city}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1" />
                              {consultant.experience}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-1" />
                              {consultant.appointmentCount || 0} consultations completed
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">{consultant.bio}</p>

                          <div className="mt-3 flex flex-wrap gap-1">
                            {consultant.consultationModes.map((mode) => (
                              <Badge key={mode} variant="outline" className="text-xs">
                                {mode.replace("-", " ")}
                              </Badge>
                            ))}
                          </div>

                          <div className="mt-4 flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleViewProfile(consultant)}>
                                  View Profile
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Dr. {selectedConsultant?.consultantName}</DialogTitle>
                                  <DialogDescription>{selectedConsultant?.specialty}</DialogDescription>
                                </DialogHeader>
                                {selectedConsultant && (
                                  <div className="space-y-6">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden">
                                        {selectedConsultant.profilePhoto ? (
                                          <img
                                            src={selectedConsultant.profilePhoto || "/placeholder.svg"}
                                            alt={selectedConsultant.consultantName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <User className="h-10 w-10 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <MapPin className="h-4 w-4" />
                                            <span>{selectedConsultant.city}</span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <DollarSign className="h-4 w-4" />
                                            <span>৳{selectedConsultant.hourlyRate}/hour</span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4" />
                                            <span>{selectedConsultant.experience}</span>
                                          </div>
                                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <User className="h-4 w-4" />
                                            <span>{selectedConsultant.appointmentCount || 0} consultations</span>
                                          </div>
                                        </div>

                                        {/* Rating Display */}
                                        <div className="mt-2">
                                          {selectedConsultant.rating && selectedConsultant.rating > 0 ? (
                                            <div className="flex items-center space-x-2">
                                              <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <Star
                                                    key={star}
                                                    className={`h-4 w-4 ${
                                                      star <= Math.round(selectedConsultant.rating!)
                                                        ? "text-yellow-400 fill-current"
                                                        : "text-gray-300"
                                                    }`}
                                                  />
                                                ))}
                                              </div>
                                              <span className="text-sm font-medium">
                                                {selectedConsultant.rating} ({selectedConsultant.reviewCount} reviews)
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center space-x-2">
                                              <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <Star key={star} className="h-4 w-4 text-gray-300" />
                                                ))}
                                              </div>
                                              <span className="text-sm text-gray-500">No reviews yet</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-medium mb-2">About</h4>
                                      <p className="text-sm text-gray-700">{selectedConsultant.bio}</p>
                                    </div>

                                    <div>
                                      <h4 className="font-medium mb-2">Languages</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedConsultant.languages.map((lang) => (
                                          <Badge key={lang} variant="outline">
                                            {lang}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-medium mb-2">Consultation Modes</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedConsultant.consultationModes.map((mode) => (
                                          <Badge key={mode} variant="secondary">
                                            {mode.replace("-", " ")}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Reviews Section */}
                                    <div>
                                      <h4 className="font-medium mb-4 flex items-center">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Reviews ({consultantReviews.length})
                                      </h4>
                                      {loadingReviews ? (
                                        <div className="text-center py-4">Loading reviews...</div>
                                      ) : consultantReviews.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                                          <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                          <p className="text-gray-500">No reviews yet</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-4 max-h-60 overflow-y-auto">
                                          {consultantReviews.map((review) => (
                                            <div key={review.id} className="border rounded-lg p-4">
                                              <div className="flex items-start justify-between mb-2">
                                                <div>
                                                  <p className="font-medium text-sm">{review.clientName}</p>
                                                  <div className="flex items-center mt-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                      <Star
                                                        key={star}
                                                        className={`h-3 w-3 ${
                                                          star <= review.rating
                                                            ? "text-yellow-400 fill-current"
                                                            : "text-gray-300"
                                                        }`}
                                                      />
                                                    ))}
                                                  </div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-700">{review.comment}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Link href={`/book-appointment/${consultant.consultantId}`}>
                              <Button size="sm">Book Appointment</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

