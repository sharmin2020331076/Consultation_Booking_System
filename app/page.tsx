import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Shield, Clock, Star, CheckCircle } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">ConsultBook</span>
            </div>
            <div className="flex space-x-4">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Connect with Expert Consultants
            <span className="text-blue-600"> Instantly</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Book appointments with verified professionals across various fields. Get expert advice through in-person,
            phone, or virtual consultations.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register?type=client">
              <Button size="lg" className="px-8 py-3">
                Book a Consultation
              </Button>
            </Link>
            <Link href="/register?type=consultant">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Join as Consultant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose ConsultBook?</h2>
            <p className="text-lg text-gray-600">Everything you need for seamless consultation booking</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Verified Consultants</CardTitle>
                <CardDescription>
                  All consultants are verified with proper credentials and certifications
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Real-time Availability</CardTitle>
                <CardDescription>See live availability and book appointments instantly</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>Your data is protected with enterprise-grade security</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Multiple Consultation Modes</CardTitle>
                <CardDescription>Choose from in-person, phone, or virtual consultations</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Star className="h-12 w-12 text-yellow-600 mb-4" />
                <CardTitle>Reviews & Ratings</CardTitle>
                <CardDescription>Read reviews and ratings from previous clients</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Easy Rescheduling</CardTitle>
                <CardDescription>Reschedule or cancel appointments with just a few clicks</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Simple steps to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Account</h3>
              <p className="text-gray-600">Sign up as a client or register as a consultant</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Find & Book</h3>
              <p className="text-gray-600">Search for consultants and book available time slots</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Consult</h3>
              <p className="text-gray-600">Attend your consultation and get expert advice</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of satisfied clients and consultants</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="px-8 py-3">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Calendar className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-xl font-bold">ConsultBook</span>
              </div>
              <p className="text-gray-400">Connecting clients with expert consultants worldwide.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For Clients</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Find Consultants</li>
                <li>Book Appointments</li>
                <li>Manage Bookings</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For Consultants</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Join Platform</li>
                <li>Manage Schedule</li>
                <li>Grow Business</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ConsultBook. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

