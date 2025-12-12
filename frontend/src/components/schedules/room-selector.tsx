"use client"

import { Room } from "../new_bookings/room-card"
import { useState } from "react"

interface RoomSelectorProps {
  rooms: Room[]
  onRoomSelect: (room: Room) => void
  selectedRoom: Room | null
}

export function RoomSelector({ rooms, onRoomSelect, selectedRoom }: RoomSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBuilding, setFilterBuilding] = useState<string>("")

  // Get unique buildings
  const buildings = Array.from(new Set(rooms.map(r => r.building)))

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const search = searchQuery.toLowerCase()
    const matchesSearch =
      room.name.toLowerCase().includes(search) ||
      room.building.toLowerCase().includes(search) ||
      (room.location ? room.location.toLowerCase().includes(search) : false)
    const matchesBuilding = !filterBuilding || room.building === filterBuilding
    return matchesSearch && matchesBuilding
  })

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-4">Select a Room to View Schedule</h2>
        
        {/* Search and Filter */}
        <div className="flex gap-4 mb-4 text-black">
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          >
            <option value="">All Buildings</option>
            {buildings.map(building => (
              <option key={building} value={building}>{building}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room)}
            className={`
              text-left p-5 rounded-lg border-2 transition-all hover:shadow-lg
              ${selectedRoom?.id === room.id 
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300" 
                : "border-gray-200 hover:border-blue-300 bg-white"
              }
            `}
          >
            {/* Room Image */}
            <div className="mb-3 h-32 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&auto=format&fit=crop"
                }}
              />
            </div>

            {/* Room Info */}
            <h3 className="font-bold text-lg text-black mb-1">{room.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {room.building} • Floor {room.floor}
              {room.location ? ` • ${room.location}` : ""}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{room.capacity} seats</span>
            </div>
            
            {room.utilities.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                {room.utilities.join(", ")}
              </p>
            )}
          </button>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No rooms found matching your criteria</p>
        </div>
      )}
    </div>
  )
}