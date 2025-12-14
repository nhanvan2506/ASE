"use client"

import Image from "next/image"

export interface Room {
  id: number
  name: string
  image: string
  building: string
  floor: string
  location?: string
  capacity: number
  utilities: string[]
}

interface RoomCardProps {
  room: Room
  onRegister: (room: Room) => void
}

export function RoomCard({ room, onRegister }: RoomCardProps) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border transition-all duration-200 flex flex-col md:flex-row hover:-translate-y-1 hover:shadow-2xl cursor-pointer">
      {/* Room Image */}
      <div className="relative w-full md:w-[180px] h-[150px] md:h-auto flex-shrink-0">
        <Image
          src={room.image}
          alt={room.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 180px"
        />
      </div>

      {/* Content */}
      <div className="flex-grow p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        <div className="md:col-span-1">
          <h3 className="text-2xl font-bold text-foreground mb-1">{room.name}</h3>
          <div className="text-sm text-muted-foreground">
            {room.building} - {room.floor}{room.location ? `, ${room.location}` : ""}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Capacity: {room.capacity} | Utilities: {room.utilities.join(", ")}
          </div>
        </div>

        <div className="md:col-span-1 md:row-start-1 flex justify-start md:justify-end items-start">
          <button
            onClick={() => onRegister(room)}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-bold text-sm"
          >
            Đăng ký
          </button>
        </div>
      </div>
    </div>
  )
}
