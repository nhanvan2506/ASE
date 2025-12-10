// src/components/schedules/weekly-page.tsx
"use client"

import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { WeeklyTimeTable } from "./time-table"
import { Room } from "../new_bookings/room-card"

// Dữ liệu mẫu (sau này sẽ fetch từ API)
const rooms: Room[] = [
  {
    id: 1,
    name: "Phòng A101",
    image: "/rooms/a101.jpg",
    building: "A",
    floor: "1",
    capacity: 40,
    utilities: ["Projector", "AC"],
  },
  {
    id: 2,
    name: "Phòng B204",
    image: "/rooms/b204.jpg",
    building: "B",
    floor: "2",
    capacity: 30,
    utilities: ["TV", "Whiteboard"],
  },
  {
    id: 3,
    name: "Phòng C305",
    image: "/rooms/c305.jpg",
    building: "C",
    floor: "3",
    capacity: 50,
    utilities: ["Projector", "Sound System"],
  },
]

const bookings = [
  { roomId: 1, date: "2025-12-10", start: "10:00", end: "12:00" },
  { roomId: 2, date: "2025-12-11", start: "14:00", end: "17:00" },
  { roomId: 3, date: "2025-12-13", start: "18:00", end: "21:00" },
]

export function WeeklyTimeTablePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container max-w-7xl mx-auto px-5 py-10 grow flex-1">
        <h1
          className="text-3xl md:text-4xl font-bold mb-8 text-center"
          style={{ fontFamily: "var(--font-heading, Orbitron, sans-serif)" }}
        >
          Book classrooms on a weekly basis.
        </h1>

        <WeeklyTimeTable rooms={rooms} bookings={bookings} />
      </main>

      <Footer />
    </div>
  )
}