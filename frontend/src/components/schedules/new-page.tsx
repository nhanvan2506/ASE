"use client"

import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { TimeTable } from "./time-table"
import { Room } from "../new_bookings/room-card"

/* =========================
   MOCK DATA (tạm thời)
========================= */

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
]

const bookings = [
  {
    roomId: 1,
    date: "2025-12-09",
    start: "10:00",
    end: "12:00",
  },
  {
    roomId: 2,
    date: "2025-12-09",
    start: "13:00",
    end: "15:00",
  },
]


export function TimeTablePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT */}
      <main className="container max-w-6xl mx-auto px-5 py-10 grow flex-1">
        <h1
          className="text-3xl md:text-4xl font-bold mb-6"
          style={{ fontFamily: "var(--font-heading, Orbitron, sans-serif)" }}
        >
          Thời khóa biểu sử dụng phòng
        </h1>

        <TimeTable rooms={rooms} bookings={bookings} />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}
