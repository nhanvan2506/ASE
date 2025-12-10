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

export interface BookingSlot {
  roomId: number
  date: string     // yyyy-MM-dd
  start: string    // HH:mm
  end: string      // HH:mm
}

interface WeeklyTimeTableProps {
  rooms: Room[]
  bookings: BookingSlot[]
}

const HOURS = Array.from({ length: 19 }, (_, i) => {
  const hour = i + 5
  return `${hour.toString().padStart(2, "0")}:00`
}) // 05:00 → 23:00

export function WeeklyTimeTable({ rooms, bookings }: WeeklyTimeTableProps) {
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
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Kiểm tra 1 phòng có bị đặt trong 1 giờ cụ thể không
  const isRoomBookedAt = (roomId: number, dateStr: string, hour: string) => {
    return bookings.some(b =>
      b.roomId === roomId &&
      b.date === dateStr &&
      hour >= b.start &&
      hour < b.end
    )
  }

  // Kiểm tra TẤT CẢ phòng có bị đặt trong giờ đó không → mới tô đỏ
  const isHourFullyBooked = (dateStr: string, hour: string) => {
    return rooms.every(room => isRoomBookedAt(room.id, dateStr, hour))
  }

  // Kiểm tra 1 phòng có trống hoàn toàn trong khoảng chọn không
  const isRoomFullyAvailable = (roomId: number) => {
    if (!selection) return false
    const { date, startHour, endHour } = selection
    const startH = parseInt(startHour)
    const endH = parseInt(endHour)

    for (let h = startH; h < endH; h++) {
      const hourStr = `${h.toString().padStart(2, "0")}:00`
      if (isRoomBookedAt(roomId, date, hourStr)) return false
    }
    return true
  }


  // Xử lý click vào ô giờ
  const handleCellClick = (dateStr: string, hour: string) => {
    if (!selection || selection.date !== dateStr) {
      // Bắt đầu chọn mới
      setSelection({ date: dateStr, startHour: hour, endHour: hour })
    } else {
      // Đang chọn trong cùng ngày
      const startH = parseInt(selection.startHour)
      const endH = parseInt(selection.endHour)
      const clickedH = parseInt(hour)

      if (clickedH < startH) {
        setSelection({ ...selection, startHour: hour })
      } else if (clickedH >= endH) {
        setSelection({ ...selection, endHour: hour })
      } else {
        // Click vào giữa → thu nhỏ vùng chọn
        if (Math.abs(clickedH - startH) <= Math.abs(clickedH - endH)) {
          setSelection({ ...selection, startHour: hour })
        } else {
          setSelection({ ...selection, endHour: hour })
        }
      }
    }
  }

  // Xử lý kéo chuột (giữ nguyên)
  const handleMouseDown = (dateStr: string, hour: string) => {
    setIsSelecting(true)
    setSelection({ date: dateStr, startHour: hour, endHour: hour })
  }

  const handleMouseEnter = (dateStr: string, hour: string) => {
    if (!isSelecting || !selection || selection.date !== dateStr) return
    const startH = parseInt(selection.startHour)
    const currH = parseInt(hour)
    const newStart = currH < startH ? hour : selection.startHour
    const newEnd = currH >= startH ? hour : selection.startHour
    setSelection({ ...selection, startHour: newStart, endHour: newEnd })
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

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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
                const fullyBooked = isHourFullyBooked(dateStr, hour)
                const inSelection = isInSelection(dateStr, hour)

                return (
                  <div
                    key={`${dateStr}-${hour}`}
                    className={`
                      border border-border h-14 cursor-pointer transition-all relative select-none
                      ${fullyBooked 
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
                    {fullyBooked && (
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

      {/* Hiển thị phòng trống */}
      {selection && (
        <div className="mt-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-300">
          <h3 className="text-xl font-bold text-black mb-4">
            Khung giờ đang chọn:
            <span className="text-blue-700 ml-2">
              {format(new Date(selection.date), "dd/MM/yyyy")} • {selection.startHour} → {selection.endHour}
            </span>
          </h3>

          <p className="text-sm text-gray-700 mb-4">
            Các phòng <span className="font-bold text-green-600">HOÀN TOÀN TRỐNG</span>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms
              .filter(room => isRoomFullyAvailable(room.id))
              .map(room => (
                <div
                  key={room.id}
                  className="bg-white p-5 rounded-lg border-2 border-green-500 shadow hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <h4 className="font-bold text-lg text-black">{room.name}</h4>
                  <p className="text-sm text-gray-600">
                    {room.building} • Tầng {room.floor} • {room.capacity} chỗ
                  </p>
                  <button className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium">
                    Book this room
                  </button>
                </div>
              ))}

            {rooms.filter(r => isRoomFullyAvailable(r.id)).length === 0 && (
              <p className="col-span-full text-center text-red-600 font-medium py-8">
                Không có phòng nào trống hoàn toàn
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 mt-8 text-sm text-black">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-green-50 border border-green-400" />
          Còn phòng trống
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-red-100 border border-red-400" />
          Tất cả phòng đã đặt
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-200 ring-4 ring-blue-500 ring-inset" />
          Đang chọn
        </div>
      </div>
    </div>
  )
}