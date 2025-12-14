// src/components/schedules/weekly-page.tsx
"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { WeeklyTimeTable } from "./time-table"
import { RoomSelector } from "./room-selector"
import { Room } from "../new_bookings/room-card"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRequireAuth } from "@/hooks/useRequireAuth"

export function WeeklyTimeTablePage() {
  const user = useRequireAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all spaces
        const spacesResponse = await api.get<any>(
          "/spaces",
          { limit: 100 },
          false
        )
        
        const fetchedRooms: Room[] = spacesResponse.data.map((space: any) => ({
          id: space.id,
          name: space.name,
          image: space.image_url || "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&auto=format&fit=crop",
          building: space.building,
          floor: space.floor,
          location: space.location,
          capacity: space.capacity,
          utilities: space.utilities || [],
        }))
        
        setRooms(fetchedRooms)
        
        // Fetch bookings for the current week
        const bookingsResponse = await api.get<any>(
          "/bookings",
          { limit: 100, my: false },
          true
        )
        
        setBookings(bookingsResponse.data || [])
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load rooms and bookings")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleBookingSuccess = async () => {
    // Refresh bookings data after successful booking
    try {
      const bookingsResponse = await api.get<any>(
        "/bookings",
        { limit: 100, my: false },
        true
      )
      setBookings(bookingsResponse.data || [])
    } catch (error) {
      console.error("Failed to refresh bookings:", error)
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section with Header */}
      <div className="relative min-h-[400px] flex flex-col bg-background">
        {/* Background Image with Dark Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-100"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.85)), url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2069&auto=format&fit=crop')`,
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
                View Room Schedules & Book Classes
              </h1>
              <p className="text-lg md:text-xl font-light text-white/90 max-w-[600px] mx-auto">
                Select a room to view its weekly schedule and book available time slots.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-5 py-10 flex-grow space-y-8">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">Loading schedule...</p>
          </div>
        ) : (
          <>
            {/* Room Selection */}
            <RoomSelector
              rooms={rooms}
              onRoomSelect={setSelectedRoom}
              selectedRoom={selectedRoom}
            />
            
            {/* Weekly Timetable */}
            <WeeklyTimeTable
              room={selectedRoom}
              bookings={bookings}
              onBookingSuccess={handleBookingSuccess}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}