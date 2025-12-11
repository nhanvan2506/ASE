// src/components/schedules/weekly-time-table.tsx
"use client"

import React, { useState, useRef, useEffect } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
} from "date-fns"
import { Room } from "../new_bookings/room-card"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { BookingConfirmModal } from "./booking-confirm-modal"
import { useAuth } from "@/hooks/useAuth"

export interface BookingSlot {
  roomId: number
  date: string     // yyyy-MM-dd
  start: string    // HH:mm
  end: string      // HH:mm
}

interface WeeklyTimeTableProps {
  room: Room | null
  bookings: any[] // API booking format
  onBookingSuccess?: () => void // Callback to refresh bookings
}

const HOURS = Array.from({ length: 19 }, (_, i) => {
  const hour = i + 5
  return `${hour.toString().padStart(2, "0")}:00`
}) // 05:00 → 23:00

export function WeeklyTimeTable({ room, bookings, onBookingSuccess }: WeeklyTimeTableProps) {
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  // Lưu khoảng chọn: { date, startHour, endHour }
  const [selection, setSelection] = useState<{
    date: string
    startHour: string
    endHour: string
  } | null>(null)

  const [isSelecting, setIsSelecting] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Convert API bookings to BookingSlot format - only for the selected room and active bookings
  const convertedBookings: BookingSlot[] = room
    ? bookings
        .filter((b: any) =>
          b.space_id === room.id &&
          (b.status === 'pending' || b.status === 'approved')
        )
        .map((b: any) => ({
          roomId: b.space_id,
          date: b.booking_date,
          start: b.start_time.slice(0, 5), // HH:MM
          end: b.end_time.slice(0, 5), // HH:MM
        }))
    : []

  // Check if the room is booked at a specific hour
  const isRoomBookedAt = (dateStr: string, hour: string) => {
    if (!room) return false
    return convertedBookings.some(b =>
      b.date === dateStr &&
      hour >= b.start &&
      hour < b.end
    )
  }

  // Check if the selected room is fully available in the selected time range
  const isTimeSlotAvailable = () => {
    if (!selection || !room) return false
    const { date, startHour, endHour } = selection
    const startH = parseInt(startHour)
    const endH = parseInt(endHour)

    for (let h = startH; h < endH; h++) {
      const hourStr = `${h.toString().padStart(2, "0")}:00`
      if (isRoomBookedAt(date, hourStr)) return false
    }
    return true
  }


  // Xử lý click vào ô giờ - chỉ cho phép chọn giờ tròn
  const handleCellClick = (dateStr: string, hour: string) => {
    // Validate rounded hour
    const hourNum = parseInt(hour)
    
    if (!selection || selection.date !== dateStr) {
      // Bắt đầu chọn mới - start hour và end hour sẽ là giờ tiếp theo
      const nextHour = (hourNum + 1).toString().padStart(2, "0") + ":00"
      setSelection({ date: dateStr, startHour: hour, endHour: nextHour })
    } else {
      // Đang chọn trong cùng ngày
      const startH = parseInt(selection.startHour)
      const endH = parseInt(selection.endHour)
      const clickedH = hourNum

      if (clickedH < startH) {
        // Extend backwards
        setSelection({ ...selection, startHour: hour })
      } else if (clickedH >= endH) {
        // Extend forwards - endHour is the next hour after clicked
        const nextHour = (clickedH + 1).toString().padStart(2, "0") + ":00"
        setSelection({ ...selection, endHour: nextHour })
      } else {
        // Click vào giữa → thu nhỏ vùng chọn
        if (Math.abs(clickedH - startH) <= Math.abs(clickedH - endH)) {
          setSelection({ ...selection, startHour: hour })
        } else {
          const nextHour = (clickedH + 1).toString().padStart(2, "0") + ":00"
          setSelection({ ...selection, endHour: nextHour })
        }
      }
    }
  }

  // Xử lý kéo chuột - rounded hour
  const handleMouseDown = (dateStr: string, hour: string) => {
    setIsSelecting(true)
    const hourNum = parseInt(hour)
    const nextHour = (hourNum + 1).toString().padStart(2, "0") + ":00"
    setSelection({ date: dateStr, startHour: hour, endHour: nextHour })
  }

  const handleMouseEnter = (dateStr: string, hour: string) => {
    if (!isSelecting || !selection || selection.date !== dateStr) return
    const startH = parseInt(selection.startHour)
    const currH = parseInt(hour)
    
    if (currH < startH) {
      setSelection({ ...selection, startHour: hour })
    } else {
      const nextHour = (currH + 1).toString().padStart(2, "0") + ":00"
      setSelection({ ...selection, endHour: nextHour })
    }
  }

  const handleMouseUp = () => setIsSelecting(false)

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp)
    return () => window.removeEventListener("mouseup", handleMouseUp)
  }, [])

  // Hàm kiểm tra ô có nằm trong vùng chọn không
  const isInSelection = (dateStr: string, hour: string) => {
    if (!selection || selection.date !== dateStr) return false
    const h = parseInt(hour)
    const startH = parseInt(selection.startHour)
    const endH = parseInt(selection.endHour)
    return h >= startH && h < endH
  }

  // Show confirm modal
  const handleBookRoomClick = () => {
    setIsConfirmModalOpen(true)
  }

  // Handle booking confirmation
  const handleConfirmBooking = async (purpose: string) => {
    if (!selection || !room) return

    setIsConfirmModalOpen(false)

    // Show loading toast
    const loadingToast = toast.loading("Creating booking...")

    try {
      const bookingData = {
        space_id: room.id,
        booking_date: selection.date,
        start_time: selection.startHour,
        end_time: selection.endHour,
        attendees: 1,
        purpose
      }

      await api.post("/bookings", bookingData, true)
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast)
      toast.success(`Successfully booked ${room.name} for ${selection.startHour} - ${selection.endHour}`, {
        duration: 4000,
      })
      
      // Clear selection and refresh data without page reload
      setSelection(null)
      
      // Call callback to refresh bookings data
      if (onBookingSuccess) {
        onBookingSuccess()
      }
    } catch (error: any) {
      console.error("Booking error:", error)
      toast.dismiss(loadingToast)
      toast.error(error.response?.data?.detail || "Failed to book room", {
        duration: 5000,
      })
    }
  }

  // Handle modal close
  const handleCloseModal = () => {
    setIsConfirmModalOpen(false)
  }

  if (!room) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 text-center py-20">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-xl text-gray-600 font-medium">Select a room to view its schedule</p>
        <p className="text-sm text-gray-500 mt-2">Choose a room from the list above to see its weekly availability</p>
      </div>
    )
  }

  const { isLecturer} = useAuth()

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      {/* Room Info Header */}
      <div className="mb-6 pb-4 border-b border-border">
        <h2 className="text-2xl font-bold text-black">{room.name}</h2>
        <p className="text-gray-600 mt-1">
          {room.building} • Floor {room.floor} • Capacity: {room.capacity}
        </p>
        {room.utilities.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Utilities: {room.utilities.join(", ")}
          </p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-sm px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-lg transition font-medium shadow-sm"
          >
            Tuần này
          </button>
          <DatePicker
            selected={weekStart}
            onChange={(date) => setWeekStart(startOfWeek(date || new Date(), { weekStartsOn: 1 }))}
            minDate={new Date()} // Đây chính là dòng quan trọng!
            customInput={
              <button className="flex items-center gap-2 border-2 border-black rounded-lg px-5 py-2.5 text-sm font-semibold text-black hover:bg-gray-50 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {format(weekStart, "dd/MM")} → {format(addDays(weekStart, 6), "dd/MM/yyyy")}
                </span>
              </button>
            }
            popperPlacement="bottom-end"
            showWeekNumbers
          />
        </div>

      {/* Bảng lịch */}
      <div className="overflow-x-auto border border-border rounded-lg select-none">
        <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-0 text-sm min-w-[900px]">
          {/* Header ngày */}
          <div></div>
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            return (
              <div
                key={dateStr}
                className={`text-center py-3 font-bold border-b border-border ${
                  isSameDay(day, new Date()) ? "text-blue-600" : "text-black"
                }`}
              >
                <div>{format(day, "EEE")}</div>
                <div className="text-lg">{format(day, "dd/MM")}</div>
              </div>
            )
          })}

          {/* Các dòng giờ */}
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="text-right pr-3 py-3 font-medium text-black border-b border-border">
                {hour}
              </div>
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const isBooked = isRoomBookedAt(dateStr, hour)
                const inSelection = isInSelection(dateStr, hour)

                return (
                  <div
                    key={`${dateStr}-${hour}`}
                    className={`
                      border border-border h-14 cursor-pointer transition-all relative select-none
                      ${isBooked
                        ? "bg-red-100 hover:bg-red-150"
                        : "bg-green-50 hover:bg-green-100"
                      }
                      ${inSelection ? "bg-blue-200 ring-4 ring-blue-500 ring-inset z-10" : ""}
                    `}
                    onClick={() => handleCellClick(dateStr, hour)}
                    onMouseDown={(e) => { e.preventDefault()
                                          handleMouseDown(dateStr, hour)
                                        }}
                    onMouseEnter={() => handleMouseEnter(dateStr, hour)}
                  >
                    {isBooked && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-700">
                        ĐÃ ĐẶT
                      </div>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Booking Section */}
      {selection && isLecturer && (
        <div className={`mt-8 p-6 rounded-xl border-2 ${
          isTimeSlotAvailable()
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}>
          <h3 className="text-xl font-bold text-black mb-4">
            Selected Time Slot:
            <span className={`ml-2 ${isTimeSlotAvailable() ? "text-green-700" : "text-red-700"}`}>
              {format(new Date(selection.date), "dd/MM/yyyy")} • {selection.startHour} → {selection.endHour}
            </span>
          </h3>

          {isTimeSlotAvailable() ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-green-700">
                  {room.name} is available for this time slot
                </p>
              </div>
              <button
                onClick={handleBookRoomClick}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium text-lg"
              >
                Book {room.name} for this time
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-red-700">
                {room.name} is not available for this entire time slot
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 mt-8 text-sm text-black">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-green-50 border border-green-400" />
          Phòng trống
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-red-100 border border-red-400" />
          Phòng đã đặt
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-200 ring-4 ring-blue-500 ring-inset" />
          Đang chọn
        </div>
      </div>

      {/* Booking Confirm Modal */}
      <BookingConfirmModal
        room={room}
        date={selection?.date || ""}
        startTime={selection?.startHour || ""}
        endTime={selection?.endHour || ""}
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirmBooking}
        onClose={handleCloseModal}
      />
    </div>
  )
}