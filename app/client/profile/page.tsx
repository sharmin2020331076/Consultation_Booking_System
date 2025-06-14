"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { updatePassword, updateEmail } from "firebase/auth"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, Save, User, Mail, Phone, Lock } from "lucide-react"
import Link from "next/link"
import FileUpload from "@/components/file-upload"

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
  contentType: string
}

interface ClientProfile {
  name: string
  email: string
  phone: string
  profilePhoto?: string
}

export default function ClientProfilePage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<UploadedFile[]>([])
  const [profile, setProfile] = useState<ClientProfile>({
    name: "",
    email: "",
    phone: "",
  })
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    if (!loading && (!user || userData?.role !== "client")) {
      router.push("/login")
      return
    }

    if (user && userData) {
      setProfile({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      })

      if (userData.profilePhoto) {
        setProfilePhoto([
          {
            id: "existing",
            filename: "profile.jpg",
            originalName: "Profile Photo",
            url: userData.profilePhoto,
            contentType: "image/jpeg",
          },
        ])
      }
    }
  }, [user, userData, loading, router])

  const handleSaveProfile = async () => {
    if (!profile.name.trim() || !profile.phone.trim()) {
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
        name: profile.name,
        phone: profile.phone,
        profilePhoto: profilePhoto.length > 0 ? profilePhoto[0].url : null,
        updatedAt: new Date().toISOString(),
      }

      // Update user document
      await updateDoc(doc(db, "users", user.uid), profileData)

      // Update email if changed
      if (profile.email !== userData?.email) {
        await updateEmail(user, profile.email)
        await updateDoc(doc(db, "users", user.uid), {
          email: profile.email,
        })
      }

      alert("Profile updated successfully!")

      // Refresh the page to get updated data
      window.location.reload()
    } catch (error) {
      console.error("Error updating profile:", error)
      alert(`Error updating profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      alert("Please fill in all password fields!")
      return
    }

    if (passwords.new !== passwords.confirm) {
      alert("New passwords don't match!")
      return
    }

    if (passwords.new.length < 6) {
      alert("Password must be at least 6 characters long!")
      return
    }

    if (!user) {
      alert("User not authenticated!")
      return
    }

    setUpdatingPassword(true)
    try {
      await updatePassword(user, passwords.new)
      alert("Password updated successfully!")
      setPasswords({ current: "", new: "", confirm: "" })
    } catch (error) {
      console.error("Error updating password:", error)
      alert(`Error updating password: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setUpdatingPassword(false)
    }
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
              <Link href="/dashboard/client">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Client Profile</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Client
              </Badge>
              <span className="text-gray-700">{userData?.name}</span>
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
                <CardDescription>Update your personal information</CardDescription>
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
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Password Update */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button onClick={handleUpdatePassword} disabled={updatingPassword} className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  {updatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Profile Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
                    {profilePhoto.length > 0 ? (
                      <img
                        src={profilePhoto[0].url || "/placeholder.svg"}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{profile.name || "Your Name"}</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 mt-2">
                    Client
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">{profile.email || "Email not set"}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">{profile.phone || "Phone not set"}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Member since {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Type:</span>
                  <Badge variant="outline">Client</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
