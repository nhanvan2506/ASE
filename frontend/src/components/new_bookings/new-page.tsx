// src/components/new_bookings/new-room-page.tsx
"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { toast } from "sonner"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { RoomCard, type Room } from "./room-card"
import { NewRoomModal } from "./new-room-modal"

export interface BookingSlot {
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;   // HH:mm
}


export function NewBookingsPage() {
  const user = useRequireAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [existingBookings, setExistingBookings] = useState<Record<number, BookingSlot[]>>({})

  useEffect(() => {
    if (!user) return

    // Fake rooms
    const fakeRooms: Room[] = [
      {
        id: 1,
        name: "Phòng học A101",
        image: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&auto=format&fit=crop",
        building: "Tòa nhà A",
        floor: "Tầng 1",
        capacity: 30,
        utilities: ["Máy chiếu", "WiFi", "Bảng trắng"],
      },
      {
        id: 2,
        name: "Phòng học B202",
        image: "https://images.unsplash.com/photo-1581091215368-4b95ca45d2a0?w=800&auto=format&fit=crop",
        building: "Tòa nhà B",
        floor: "Tầng 2",
        capacity: 25,
        utilities: ["WiFi", "Điều hòa"],
      },
      {
        id: 3,
        name: "Phòng học C303",
        image: "https://images.unsplash.com/photo-1581091870622-2f1b7b5f3e12?w=800&auto=format&fit=crop",
        building: "Tòa nhà C",
        floor: "Tầng 3",
        capacity: 20,
        utilities: ["Máy chiếu", "WiFi"],
      },
    ]
    setRooms(fakeRooms)

    // Fake existing bookings for each room
    const fakeBookings: Record<number, BookingSlot[]> = {
      1: [
        { date: "2025-12-01", start: "09:00", end: "11:00" },
        { date: "2025-12-01", start: "14:00", end: "16:00" },
      ],
      2: [
        { date: "2025-12-01", start: "08:00", end: "10:00" },
        { date: "2025-12-02", start: "13:00", end: "15:00" },
      ],
      3: [
        { date: "2025-12-01", start: "10:00", end: "12:00" },
      ],
    }
    setExistingBookings(fakeBookings)
  }, [user])

  const handleRegisterClick = (room: Room) => {
    setSelectedRoom(room)
    setModalOpen(true)
  }

  const handleBookingConfirmed = (room: Room, slot: BookingSlot) => {
    toast.success(`Đăng ký phòng ${room.name} thành công! ${slot.date} ${slot.start} - ${slot.end}`)
    // Cập nhật fake existingBookings để hiển thị lần sau
    setExistingBookings((prev) => {
      const prevSlots = prev[room.id] || []
      return { ...prev, [room.id]: [...prevSlots, slot] }
    })
    setModalOpen(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="container max-w-[900px] mx-auto px-5 py-10 grid gap-5">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} onRegister={handleRegisterClick} />
        ))}
      </main>

      <Footer />

      {/* Modal for booking */}
      {selectedRoom && (
        <NewRoomModal
          room={selectedRoom}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          existingBookings={existingBookings[selectedRoom.id] || []}
          onBookingConfirmed={handleBookingConfirmed}
        />
      )}
    </div>
  )
}
