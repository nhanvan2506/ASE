"use client"

import { useState, useEffect } from "react"
import { Header } from "../landing/header"
import { Footer } from "../landing/footer"
import { BookingCard, type Booking } from "./booking-card"
import { BookingStatus } from "@/schemas/api"
import { QRDoorModal } from "./qr-door-modal"
import { toast } from "sonner"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { api } from "@/lib/api"
import type { BookingResponse, PaginatedResponse } from "@/schemas/api"

// Helper to convert API booking to display format
const convertBookingToDisplay = (apiBooking: BookingResponse): Booking => {
  const space = apiBooking.space
  return {
    id: apiBooking.id,
    roomName: space?.name || "Unknown Room",
    roomImage: space?.image_url || "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&auto=format&fit=crop",
    status: apiBooking.status,
    date: new Date(apiBooking.booking_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${apiBooking.start_time.slice(0, 5)} - ${apiBooking.end_time.slice(0, 5)}`,
    location: space ? `${space.building} - ${space.floor}${space.location ? `, ${space.location}` : ""}` : "Unknown Location",
    attendees: apiBooking.attendees,
    utilities: space?.utilities || [],
    purpose: apiBooking.purpose,
  }
}

export function BookingsPage() {
  const user = useRequireAuth()
  const [activeFilter, setActiveFilter] = useState<BookingStatus | "all">("all")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch bookings from API
  useEffect(() => {
    if (!user) return

    const fetchBookings = async () => {
      setLoading(true)
      try {
        const response = await api.get<PaginatedResponse<BookingResponse>>(
          "/bookings",
          { limit: 100, my: true },
          true
        )
        const displayBookings = response.data.map(convertBookingToDisplay)
        setBookings(displayBookings)
      } catch (error) {
        console.error("Failed to fetch bookings:", error)
        toast.error("Failed to load bookings")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [user])

  // Filter bookings based on active tab
  const filteredBookings = activeFilter === "all"
    ? bookings
    : bookings.filter((booking) => booking.status === activeFilter)

  const handleDeleteBooking = async (id: number) => {
    try {
      // Use PATCH to cancel the booking instead of DELETE
      const response = await api.patch<BookingResponse>(
        `/bookings/${id}`,
        { status: BookingStatus.CANCELLED },
        true
      )
      // Update the booking status in the list
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? convertBookingToDisplay(response)
            : booking
        )
      )
      toast.success("Booking cancelled successfully")
    } catch (error) {
      console.error("Failed to cancel booking:", error)
      toast.error("Failed to cancel booking")
    }
  }

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const tabs: Array<{ key: BookingStatus | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: BookingStatus.PENDING, label: "Pending" },
    { key: BookingStatus.APPROVED, label: "Approved" },
    { key: BookingStatus.COMPLETED, label: "Completed" },
    { key: BookingStatus.REJECTED, label: "Rejected" },
    { key: BookingStatus.CANCELLED, label: "Cancelled" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section with Header */}
      <div className="relative min-h-[400px] flex flex-col bg-background">
        {/* Background Image with Dark Overlay - Always dark for readability */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-100"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.85)), url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col">
          <Header />

          <div className="flex flex-col justify-center items-center text-center px-5 py-20">
            <div className="container max-w-[900px] mx-auto">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white"
                style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
              >
                My Schedules!
              </h1>
              <p className="text-lg md:text-xl font-light text-white/90 max-w-[600px] mx-auto">
                Keep track of all the classrooms you&apos;ve booked in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container max-w-[900px] mx-auto px-5 py-10 flex-grow">
        {/* Tabs */}
        <div className="flex justify-center mb-10 overflow-x-auto">
          <div className="bg-muted p-2 rounded-xl flex gap-2 min-w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`py-3 px-5 text-sm md:text-base font-bold rounded-lg transition-all whitespace-nowrap ${
                  activeFilter === tab.key
                    ? "bg-foreground text-background shadow-md"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        <div className="grid gap-5">
          {loading ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">Loading bookings...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onDelete={handleDeleteBooking}
                onClick={handleBookingClick}
              />
            ))
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                No {activeFilter === "all" ? "" : activeFilter} bookings found.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* QR & Door Control Modal */}
      <QRDoorModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}