"use client"

import { useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format } from "date-fns"
import { Room } from "../new_bookings/room-card"

export interface BookingSlot {
  roomId: number
  date: string   // yyyy-MM-dd
  start: string  // HH:mm
  end: string    // HH:mm
}

interface TimeTableProps {
  rooms: Room[]
  bookings: BookingSlot[]
}


const HOURS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
]

export function TimeTable({ rooms, bookings }: TimeTableProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const dateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : ""

  const isBooked = (
    roomId: number,
    hour: string
  ): BookingSlot | null => {
    return (
      bookings.find(
        (b) =>
          b.roomId === roomId &&
          b.date === dateStr &&
          hour >= b.start &&
          hour < b.end
      ) || null
    )
  }


  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 text-black">
        <h2 className="text-2xl font-bold">Thời khóa biểu phòng</h2>

        <DatePicker
          selected={selectedDate}
          onChange={setSelectedDate}
          dateFormat="dd/MM/yyyy"
          className="border rounded px-3 py-2"
        />
      </div>

      {/* TABLE HEADER */}
      <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2 text-sm font-semibold mb-2 text-black">
        <div>Phòng</div>
        {HOURS.map((h) => (
          <div key={h} className="text-center text-black">
            {h}
          </div>
        ))}
      </div>

      {/* TABLE BODY */}
      <div className="space-y-2 text-black">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="grid grid-cols-[180px_repeat(7,1fr)] gap-2 items-center text-black"
          >
            {/* ROOM INFO */}
            <div className="font-medium">
              <div>{room.name}</div>
              <div className="text-xs text-muted-foreground">
                {room.building} - {room.floor}
              </div>
            </div>

            {/* TIME CELLS */}
            {HOURS.map((hour) => {
              const booked = isBooked(room.id, hour)

              return (
                <div
                  key={hour}
                  className={`py-2 rounded text-black text-xs text-center font-medium
                    transition-colors
                    ${
                      booked
                        ? "bg-red-200 text-red-800 border border-red-300"
                        : "bg-green-200 text-green-800 border border-green-300"
                    }
                  `}
                >
                  {booked ? "Đã đặt" : "Trống"}
                </div>

              )
            })}
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Không có dữ liệu phòng
          </p>
        )}
      </div>

      {/* LEGEND */}
      <div className="flex gap-4 mt-6 text-sm text-black ">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-100" />
          Phòng trống
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-100" />
          Đã được đăng ký
        </div>
      </div>
    </div>
  )
}
