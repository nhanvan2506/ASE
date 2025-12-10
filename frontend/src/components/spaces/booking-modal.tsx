
"use client"

import { useState } from "react"
import Image from "next/image"
import type { Room } from "./room-card"
import { bookingsApi } from "@/lib/bookings"
import { toast } from "sonner"
import { ApiException } from "@/lib/api"

interface BookingModalProps {
  room: Room | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export interface BookingData {
  room: Room
  date: string
  timeSlot: string
  attendees: number
  purpose: string
}

export function BookingModal({ room, isOpen, onClose, onConfirm }: BookingModalProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [attendees, setAttendees] = useState<string>("")
  const [purpose, setPurpose] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !room) return null

  // Get calendar days for current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0

    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const selectDate = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    // Don't allow selecting dates in the past
    if (selected >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      setSelectedDate(selected)
    }
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
  }

  const isToday = (day: number) => {
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
  }

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return date < todayDate
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]

  // Generate rounded-hour time slots from 7 AM to 9 PM
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const startHour = i + 7 // Start from 7 AM
    const endHour = startHour + 1
    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`
  })

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot || !attendees || !purpose) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate attendees
    const attendeesNum = parseInt(attendees)
    if (isNaN(attendeesNum) || attendeesNum < 1) {
      toast.error("Number of attendees must be at least 1")
      return
    }

    if (attendeesNum > room.capacity) {
      toast.error(`Number of attendees (${attendeesNum}) exceeds room capacity (${room.capacity})`)
      return
    }

    try {
      setIsSubmitting(true)

      // Parse time slot (e.g., "07:00 - 08:00" -> start: "07:00:00", end: "08:00:00")
      const [startTime, endTime] = selectedTimeSlot.split(" - ").map(t => `${t}:00`)

      // Format date as YYYY-MM-DD
      const bookingDate = selectedDate.toISOString().split('T')[0]

      await bookingsApi.create({
        space_id: room.id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        attendees: attendeesNum,
        purpose,
      })

      toast.success(
        `Successfully booked ${room.name}!`,
        {
          description: `${bookingDate} at ${selectedTimeSlot} for ${attendeesNum} attendees`,
          duration: 5000,
        }
      )

      // Reset form
      setSelectedDate(null)
      setSelectedTimeSlot("")
      setAttendees("")
      setPurpose("")

      onConfirm()
      onClose()
    } catch (err) {
      console.error("Error creating booking:", err)
      if (err instanceof ApiException) {
        toast.error(`Failed to create booking: ${err.message}`)
      } else {
        toast.error("Failed to create booking. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-muted rounded-2xl overflow-hidden w-full max-w-[800px] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-white text-4xl leading-none opacity-70 hover:opacity-100 transition-opacity z-10"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Modal Header with Background Image */}
        <header className="relative text-white p-8">
          <div className="absolute inset-0 z-0">
            <Image
              src={room.image_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop"}
              alt={room.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/40" />
          </div>

          <div className="relative z-10">
            <h1
              className="text-4xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
            >
              {room.name}
            </h1>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {room.building} - {room.floor}
              </span>
              <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Capacity: {room.capacity}
              </span>
            </div>

            <div className="border-t border-white/30 pt-4">
              <h4 className="text-xs uppercase tracking-wider mb-3 text-white/80 font-bold">
                Available Utilities
              </h4>
              <div className="flex flex-wrap gap-4">
                {room.utilities.includes("wifi") && (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    WiFi
                  </span>
                )}
                {room.utilities.includes("ac") && (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Air Conditioner
                  </span>
                )}
                {room.utilities.includes("whiteboard") && (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Whiteboard
                  </span>
                )}
                {room.utilities.includes("outlet") && (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Power Outlet
                  </span>
                )}
                {room.utilities.length === 0 && (
                  <span className="text-sm text-white/60">No utilities available</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-background overflow-y-auto">
          {/* Calendar Section */}
          <div>
            <h3 className="text-xl mb-4 text-foreground font-bold">
              Select day <span className="text-red-500">*</span>
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={prevMonth}
                  className="p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="font-bold text-foreground">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                  <div key={day} className="text-muted-foreground font-bold">
                    {day}
                  </div>
                ))}
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => selectDate(day)}
                    disabled={isPastDate(day)}
                    className={`p-2 rounded-full transition-colors font-bold ${
                      isDateSelected(day)
                        ? "bg-foreground text-background"
                        : isToday(day)
                        ? "bg-muted-foreground/20 text-foreground"
                        : isPastDate(day)
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-foreground hover:bg-muted-foreground/10"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div>
            <h3 className="text-xl mb-4 text-foreground font-bold">
              Select time slot <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-muted-foreground block mt-1">
                Only rounded-hour slots available (e.g., 08:00-09:00)
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-6 max-h-[200px] overflow-y-auto">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition-all font-bold ${
                    selectedTimeSlot === slot
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {slot}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="attendees" className="block mb-2 font-bold text-foreground">
                  Number of Attendees <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="attendees"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  min="1"
                  max={room.capacity}
                  placeholder={`Enter 1-${room.capacity} attendees...`}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
                {attendees && parseInt(attendees) > room.capacity && (
                  <p className="text-red-500 text-sm mt-1">
                    Exceeds room capacity ({room.capacity})
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="purpose" className="block mb-2 font-bold text-foreground">
                  Purpose/Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="e.g., Team meeting, Workshop, Class session..."
                  className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="p-8 border-t border-border bg-background flex justify-center">
          <div className="flex flex-col items-center w-[250px]">
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTimeSlot || !attendees || !purpose || isSubmitting}
              className="w-full py-4 rounded-2xl bg-foreground text-background font-bold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Booking..." : "Confirm Booking"}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="mt-5 bg-none border-none p-0 text-muted-foreground font-bold transition-colors hover:text-foreground hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}