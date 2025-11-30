// src/components/new_bookings/new-room-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { Room } from "./room-card"
import { toast } from "sonner"

export interface BookingSlot {
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string   // HH:mm
}

interface NewRoomModalProps {
  room: Room | null
  isOpen: boolean
  onClose: () => void
  existingBookings?: BookingSlot[]
  onBookingConfirmed: (room: Room, slot: BookingSlot) => void
}

export function NewRoomModal({
  room,
  isOpen,
  onClose,
  existingBookings = [],
  onBookingConfirmed,
}: NewRoomModalProps) {
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedStart, setSelectedStart] = useState("")
  const [selectedEnd, setSelectedEnd] = useState("")
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([])

  useEffect(() => {
    if (!room || !isOpen) return
    // Reset selections khi mở modal
    setSelectedDate("")
    setSelectedStart("")
    setSelectedEnd("")
    setAvailableSlots(existingBookings)
  }, [room, isOpen, existingBookings])

  if (!isOpen || !room) return null

  // Demo: tạo khung giờ trống 8:00 - 17:00 mỗi 1 tiếng
  const generateTimeSlots = () => {
    const slots: BookingSlot[] = []
    const date = selectedDate || new Date().toISOString().split("T")[0]
    for (let hour = 8; hour < 17; hour++) {
      const start = hour.toString().padStart(2, "0") + ":00"
      const end = (hour + 1).toString().padStart(2, "0") + ":00"
      // Nếu chưa được book
      const conflict = existingBookings.find(
        (b) => b.date === date && !(end <= b.start || start >= b.end)
      )
      if (!conflict) slots.push({ date, start, end })
    }
    return slots
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
    setAvailableSlots(generateTimeSlots())
    setSelectedStart("")
    setSelectedEnd("")
  }

  const handleRegister = () => {
    if (!selectedDate || !selectedStart || !selectedEnd) {
      toast.error("Vui lòng chọn ngày và khung giờ!")
      return
    }

    const slot = { date: selectedDate, start: selectedStart, end: selectedEnd }
    onBookingConfirmed(room, slot) // <-- Gọi prop từ cha
    toast.success(`Đăng ký ${room.name} thành công từ ${selectedStart} đến ${selectedEnd} ngày ${selectedDate}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-white text-black rounded-2xl p-8 w-full max-w-[400px] text-center animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-2">{room.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {room.building} - {room.floor} | Capacity: {room.capacity}
        </p>

        {/* Chọn ngày */}
        <div className="mb-4 text-left">
          <label className="block mb-1 font-semibold">Chọn ngày:</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>

        {/* Chọn khung giờ */}
        <div className="mb-4 text-left">
          <label className="block mb-1 font-semibold">Chọn khung giờ trống:</label>
          <div className="grid grid-cols-2 gap-2">
            {generateTimeSlots().map((slot) => (
              <button
                key={slot.start}
                className={`py-2 px-2 rounded border ${
                  selectedStart === slot.start ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
                onClick={() => {
                  setSelectedStart(slot.start)
                  setSelectedEnd(slot.end)
                }}
              >
                {slot.start} - {slot.end}
              </button>
            ))}
            {generateTimeSlots().length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2">Không còn khung giờ trống</p>
            )}
          </div>
        </div>

        {/* Nút đăng ký */}
        <button
          onClick={handleRegister}
          className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
        >
          Xác nhận đăng ký
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-3 text-gray-500 hover:text-black underline"
        >
          Hủy
        </button>
      </div>
    </div>
  )
}
