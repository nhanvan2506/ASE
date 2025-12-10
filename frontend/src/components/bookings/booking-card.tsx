"use client"

import Image from "next/image"
import { BookingStatus } from "@/schemas/api"

export { BookingStatus }

export interface Booking {
  id: number
  roomName: string
  roomImage: string
  status: BookingStatus
  date: string
  time: string
  location: string
  attendees: number
  utilities: string[]
  purpose?: string
}

interface BookingCardProps {
  booking: Booking
  onDelete: (id: number) => void
  onClick?: (booking: Booking) => void
}

export function BookingCard({ booking, onDelete, onClick }: BookingCardProps) {
  const statusStyles: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: "bg-yellow-600 text-white",
    [BookingStatus.APPROVED]: "bg-green-600 text-white",
    [BookingStatus.REJECTED]: "bg-red-600 text-white",
    [BookingStatus.CANCELLED]: "bg-gray-600 text-white",
    [BookingStatus.COMPLETED]: "bg-blue-600 text-white",
    [BookingStatus.NO_SHOW]: "bg-orange-600 text-white",
  }

  const statusLabels: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: "Pending",
    [BookingStatus.APPROVED]: "Approved",
    [BookingStatus.REJECTED]: "Rejected",
    [BookingStatus.CANCELLED]: "Cancelled",
    [BookingStatus.COMPLETED]: "Completed",
    [BookingStatus.NO_SHOW]: "No Show",
  }

  const isClickable = booking.status === BookingStatus.APPROVED

  return (
    <div
      className={`bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 flex flex-col md:flex-row ${
        isClickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-2xl" : ""
      }`}
      onClick={() => isClickable && onClick?.(booking)}
    >
      {/* Room Image */}
      <div className="relative w-full md:w-[180px] h-[150px] md:h-auto flex-shrink-0">
        <Image
          src={booking.roomImage}
          alt={booking.roomName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 180px"
        />
      </div>

      {/* Card Content */}
      <div className="flex-grow p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        {/* Header */}
        <div className="md:col-span-1">
          <h3 className="text-2xl font-bold text-foreground mb-1">
            {booking.roomName}
          </h3>
        </div>

        {/* Status Badge */}
        <div className="md:col-span-1 md:row-start-1 flex justify-start md:justify-end items-start">
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusStyles[booking.status]}`}
          >
            {statusLabels[booking.status]}
          </span>
        </div>

        {/* Details Grid */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{booking.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{booking.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{booking.location}</span>
          </div>
          {booking.utilities.length > 0 && (
            <div className="flex items-center gap-2 md:col-span-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>{booking.utilities.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Button - Only show for pending bookings */}
      {booking.status === BookingStatus.PENDING && (
        <div className="flex items-center justify-center p-4 md:pr-5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(booking.id)
            }}
            className="text-muted-foreground hover:text-red-600 transition-colors text-xl"
            aria-label="Cancel booking"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}