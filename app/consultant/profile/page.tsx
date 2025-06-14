"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, Save, Eye, MapPin, DollarSign, Clock, User } from "lucide-react"
import Link from "next/link"
import FileUpload from "@/components/file-upload"

interface ConsultantProfile {
  bio: string
  hourlyRate: number
  city: string
  experience: string
  languages: string[]
  consultationModes: string[]
  published: boolean
  profilePhoto?: string
  availability: {
    [key: string]: string[] // day: time slots
  }
}

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
  contentType: string
}

export default function ConsultantProfilePage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<UploadedFile[]>([])
  const [profile, setProfile] = useState<ConsultantProfile>({
    bio: "",
    hourlyRate: 0,
    city: "",
    experience: "",
    languages: [],
    consultationModes: [],
    published: false,
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
  })

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
      fetchProfile()
    }
  }, [user, userData, loading, router])

  const fetchProfile = async () => {
    try {
      const profileDoc = await getDoc(doc(db, "consultantProfiles", user!.uid))
      if (profileDoc.exists()) {
        const data = profileDoc.data() as ConsultantProfile
        setProfile(data)
        if (data.profilePhoto) {
          setProfilePhoto([
            {
              id: "existing",
              filename: "profile.jpg",
              originalName: "Profile Photo",
              url: data.profilePhoto,
              contentType: "image/jpeg",
            },
          ])
        }
      } else {
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile.bio.trim() || profile.hourlyRate <= 0 || !profile.city.trim()) {
      alert("Please fill in all required fields!")
      return
    }

    if (!user) {
      alert("User not authenticated!")
      return
    }

    setSaving(true)
    try {
      const profileData = {
        ...profile,
        profilePhoto: profilePhoto.length > 0 ? profilePhoto[0].url : null,
        consultantId: user.uid,
        consultantName: userData!.name,
        consultantEmail: userData!.email,
        specialty: userData!.specialty,
        updatedAt: new Date().toISOString(),
      }

      // Use setDoc instead of updateDoc to create document if it doesn't exist
      await setDoc(doc(db, "consultantProfiles", user.uid), profileData, { merge: true })

      alert("Profile saved successfully!")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert(`Error saving profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePublishProfile = async () => {
    if (!profile.bio.trim() || profile.hourlyRate <= 0 || !profile.city.trim()) {
      alert("Please complete all required fields before publishing!")
      return
    }

    if (!user) {
      alert("User not authenticated!")
      return
    }

    setSaving(true)
    try {
      const profileData = {
        ...profile,
        published: true,
        profilePhoto: profilePhoto.length > 0 ? profilePhoto[0].url : null,
        consultantId: user.uid,
        consultantName: userData!.name,
        consultantEmail: userData!.email,
        specialty: userData!.specialty,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Use setDoc instead of updateDoc to create document if it doesn't exist
      await setDoc(doc(db, "consultantProfiles", user.uid), profileData, { merge: true })

      setProfile({ ...profile, published: true })
      alert("Profile published successfully! You are now available for bookings.")
    } catch (error) {
      console.error("Error publishing profile:", error)
      alert(`Error publishing profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const addLanguage = (language: string) => {
    if (language && !profile.languages.includes(language)) {
      setProfile({ ...profile, languages: [...profile.languages, language] })
    }
  }

  const removeLanguage = (language: string) => {
    setProfile({ ...profile, languages: profile.languages.filter((l) => l !== language) })
  }

  const toggleConsultationMode = (mode: string) => {
    const modes = profile.consultationModes.includes(mode)
      ? profile.consultationModes.filter((m) => m !== mode)
      : [...profile.consultationModes, mode]
    setProfile({ ...profile, consultationModes: modes })
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
                <span className="ml-2 text-xl font-bold text-gray-900">Consultant Profile</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {profile.published && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Published
                </Badge>
              )}
              <span className="text-gray-700">Dr. {userData?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>Complete your profile to start accepting bookings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <FileUpload
                    userId={user?.uid || ""}
                    fileType="profile"
                    onUploadComplete={setProfilePhoto}
                    multiple={false}
                    accept="image/*"
                    maxSize={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio *</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell clients about your background, expertise, and approach..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (৳) *</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={profile.hourlyRate}
                      onChange={(e) => setProfile({ ...profile, hourlyRate: Number.parseInt(e.target.value) || 0 })}
                      placeholder="1500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="Dhaka"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Select onValueChange={(value) => setProfile({ ...profile, experience: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2">1-2 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="6-10">6-10 years</SelectItem>
                      <SelectItem value="11-15">11-15 years</SelectItem>
                      <SelectItem value="15+">15+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <CardDescription>Languages you can provide consultations in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((language) => (
                    <Badge key={language} variant="secondary" className="cursor-pointer">
                      {language}
                      <button onClick={() => removeLanguage(language)} className="ml-2 text-red-500 hover:text-red-700">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Select onValueChange={addLanguage}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Bengali">Bengali</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Urdu">Urdu</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Consultation Modes */}
            <Card>
              <CardHeader>
                <CardTitle>Consultation Modes</CardTitle>
                <CardDescription>How you prefer to conduct consultations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["in-person", "virtual", "phone"].map((mode) => (
                    <div
                      key={mode}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        profile.consultationModes.includes(mode)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleConsultationMode(mode)}
                    >
                      <div className="text-center">
                        <div className="capitalize font-medium">{mode.replace("-", " ")}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {mode === "in-person" && "Face-to-face meetings"}
                          {mode === "virtual" && "Video calls"}
                          {mode === "phone" && "Voice calls"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Profile Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 overflow-hidden">
                    {profilePhoto.length > 0 ? (
                      <img
                        src={profilePhoto[0].url || "/placeholder.svg"}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold">Dr. {userData?.name}</h3>
                  <p className="text-sm text-gray-600">{userData?.specialty}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{profile.city || "City not set"}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span>৳{profile.hourlyRate || 0}/hour</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{profile.experience || "Experience not set"}</span>
                  </div>
                </div>

                {profile.bio && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Bio</h4>
                    <p className="text-xs text-gray-600 line-clamp-3">{profile.bio}</p>
                  </div>
                )}

                {profile.languages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.languages.map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>

                {!profile.published ? (
                  <Button
                    onClick={handlePublishProfile}
                    disabled={saving || !profile.bio || !profile.hourlyRate || !profile.city}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Publish Profile
                  </Button>
                ) : (
                  <div className="text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Profile is Live!
                    </Badge>
                    <p className="text-xs text-gray-600 mt-2">Clients can now book appointments with you</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

