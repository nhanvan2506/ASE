"use client"

import { useState } from "react"
import { Room } from "../new_bookings/room-card"

interface BookingConfirmModalProps {
  room: Room | null
  date: string
  startTime: string
  endTime: string
  isOpen: boolean
  onConfirm: (purpose: string) => void
  onClose: () => void
}

export function BookingConfirmModal({
  room,
  date,
  startTime,
  endTime,
  isOpen,
  onConfirm,
  onClose
}: BookingConfirmModalProps) {
  const [purpose, setPurpose] = useState("")
  const [touched, setTouched] = useState(false)

  if (!isOpen || !room) return null

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-white text-black rounded-2xl p-8 w-full max-w-[500px] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
          >
            Confirm Booking
          </h2>
          <p className="text-gray-600 text-base">
            Please review your booking details
          </p>
        </div>

        {/* Booking Details */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
          {/* Room */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Room</p>
              <p className="text-lg font-bold text-black">{room.name}</p>
              <p className="text-sm text-gray-600">{room.building} • Floor {room.floor}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Date</p>
              <p className="text-lg font-bold text-black">{formatDate(date)}</p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Time</p>
              <p className="text-lg font-bold text-black">{startTime} - {endTime}</p>
            </div>
          </div>

          {/* Capacity */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Capacity</p>
              <p className="text-lg font-bold text-black">{room.capacity} seats</p>
            </div>
          </div>

          {/* Purpose Input */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 12h16M4 16h16" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Purpose (required)</p>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                onBlur={() => setTouched(true)}
                rows={3}
                className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Lecture, exam, workshop..."
              />
              {touched && !purpose.trim() && (
                <p className="text-xs text-red-600 mt-1">Purpose is required.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 text-base font-bold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setTouched(true)
              if (!purpose.trim()) return
              onConfirm(purpose.trim())
            }}
            className="flex-1 py-3 px-6 text-base font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!purpose.trim()}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  )
}