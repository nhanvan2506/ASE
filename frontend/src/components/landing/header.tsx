// "use client"

// import Link from "next/link"
// import { Logo } from "./logo"
// import { useMobile } from "@/hooks/use-mobile"
// import { useState } from "react"
// import { useTheme } from "next-themes"
// import { useAuth } from "@/hooks/useAuth"

// export function Header() {
//   const isMobile = useMobile()
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
//   const { theme, setTheme } = useTheme()
//   const { isAuthenticated, isAdmin, logout } = useAuth()

//   return (
//     <header className="py-6 px-5 relative z-20">
//       <div className="container max-w-[1100px] mx-auto">
//         <nav className="flex justify-between items-center">
//           <Link href="/" className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-white">
//             <Logo className="w-[30px] h-[30px]" color="white" />
//             <span style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}>
//               study space
//             </span>
//           </Link>
          
//           <div className="flex items-center gap-4">
//             {/* Theme Toggle */}
//             <button
//               onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//               className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
//               aria-label="Toggle theme"
//             >
//               {theme === "dark" ? (
//                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
//                 </svg>
//               ) : (
//                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
//                 </svg>
//               )}
//             </button>

//             {/* Desktop Navigation */}
//             {!isMobile && (
//               <ul className="flex items-center gap-7 list-none text-base">
//                 <li>
//                   <Link
//                     href="/"
//                     className="text-white hover:opacity-80 transition-opacity"
//                   >
//                     Home
//                   </Link>
//                 </li>
//                 {isAuthenticated && (
//                   <>
//                     <li>
//                       <Link
//                         href="/bookings"
//                         className="text-white hover:opacity-80 transition-opacity"
//                       >
//                         My Bookings
//                       </Link>
//                     </li>
//                     <li>
//                       <Link
//                         href="/profile"
//                         className="text-white hover:opacity-80 transition-opacity"
//                       >
//                         Profile
//                       </Link>
//                     </li>
//                     {isAdmin && (
//                       <li>
//                         <Link
//                           href="/admin"
//                           className="text-white hover:opacity-80 transition-opacity"
//                         >
//                           Admin
//                         </Link>
//                       </li>
//                     )}
//                   </>
//                 )}
//                 {isAuthenticated ? (
//                   <>
//                     <li>
//                       <Link
//                         href="/spaces"
//                         className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
//                       >
//                         Find A Space
//                       </Link>
//                     </li>
//                     <li>
//                       <button
//                         onClick={logout}
//                         className="text-white hover:opacity-80 transition-opacity"
//                       >
//                         Logout
//                       </button>
//                     </li>
//                   </>
//                 ) : (
//                   <li>
//                     <Link
//                       href="/auth"
//                       className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
//                     >
//                       Sign In
//                     </Link>
//                   </li>
//                 )}
//               </ul>
//             )}

//             {/* Mobile Menu Button */}
//             {isMobile && (
//               <button
//                 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//                 className="p-2 text-white"
//                 aria-label="Toggle menu"
//               >
//                 <svg
//                   className="w-6 h-6"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   {mobileMenuOpen ? (
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M6 18L18 6M6 6l12 12"
//                     />
//                   ) : (
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M4 6h16M4 12h16M4 18h16"
//                     />
//                   )}
//                 </svg>
//               </button>
//             )}
//           </div>
//         </nav>

//         {/* Mobile Menu */}
//         {isMobile && mobileMenuOpen && (
//           <div className="mt-4 py-4 border-t border-white/20">
//             <ul className="flex flex-col gap-4 list-none">
//               <li>
//                 <Link
//                   href="/"
//                   className="block text-white hover:opacity-80 transition-opacity font-bold"
//                   onClick={() => setMobileMenuOpen(false)}
//                 >
//                   Home
//                 </Link>
//               </li>
//               {isAuthenticated && (
//                 <>
//                   <li>
//                     <Link
//                       href="/bookings"
//                       className="block text-white hover:opacity-80 transition-opacity font-bold"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       My Bookings
//                     </Link>
//                   </li>
//                   <li>
//                     <Link
//                       href="/profile"
//                       className="block text-white hover:opacity-80 transition-opacity font-bold"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       Profile
//                     </Link>
//                   </li>
//                   {isAdmin && (
//                     <li>
//                       <Link
//                         href="/admin"
//                         className="block text-white hover:opacity-80 transition-opacity font-bold"
//                         onClick={() => setMobileMenuOpen(false)}
//                       >
//                         Admin
//                       </Link>
//                     </li>
//                   )}
//                 </>
//               )}
//               {isAuthenticated ? (
//                 <>
//                   <li>
//                     <Link
//                       href="/spaces"
//                       className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       Find A Space
//                     </Link>
//                   </li>
//                   <li>
//                     <button
//                       onClick={() => {
//                         logout()
//                         setMobileMenuOpen(false)
//                       }}
//                       className="block text-white hover:opacity-80 transition-opacity font-bold text-left w-full"
//                     >
//                       Logout
//                     </button>
//                   </li>
//                 </>
//               ) : (
//                 <li>
//                   <Link
//                     href="/auth"
//                     className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
//                     onClick={() => setMobileMenuOpen(false)}
//                   >
//                     Sign In
//                   </Link>
//                 </li>
//               )}
//             </ul>
//           </div>
//         )}
//       </div>
//     </header>
//   )
// }

"use client"

import Link from "next/link"
import { Logo } from "./logo"
import { useMobile } from "@/hooks/use-mobile"
import { useState } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/useAuth"

export function Header() {
  const isMobile = useMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, isAdmin, logout } = useAuth()

  return (
    <header className="py-6 px-5 relative z-20">
      <div className="container max-w-[1100px] mx-auto">
        <nav className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-white">
            <Logo className="w-[30px] h-[30px]" color="white" />
            <span style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}>
              study space
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Desktop Navigation */}
            {!isMobile && (
              <ul className="flex items-center gap-7 list-none text-base">
                <li>
                  <Link href="/" className="text-white hover:opacity-80 transition-opacity">
                    Home
                  </Link>
                </li>

                {isAuthenticated && (
                  <>
                    <li>
                      <Link href="/bookings" className="text-white hover:opacity-80 transition-opacity">
                        My Bookings
                      </Link>
                    </li>
                    <li>
                      <Link href="/profile" className="text-white hover:opacity-80 transition-opacity">
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link href="/new_bookings" className="text-white hover:opacity-80 transition-opacity">
                        Đăng ký phòng
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/timetable"
                        className="block text-white hover:opacity-80 transition-opacity font-bold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Thời khóa biểu
                      </Link>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link href="/admin" className="text-white hover:opacity-80 transition-opacity">
                          Admin
                        </Link>
                      </li>
                    )}
                  </>
                )}

                {isAuthenticated ? (
                  <>
                    <li>
                      <Link
                        href="/spaces"
                        className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
                      >
                        Find A Space
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={logout}
                        className="text-white hover:opacity-80 transition-opacity"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link
                      href="/auth"
                      className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
                    >
                      Sign In
                    </Link>
                  </li>
                )}
              </ul>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            )}
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobile && mobileMenuOpen && (
          <div className="mt-4 py-4 border-t border-white/20">
            <ul className="flex flex-col gap-4 list-none">
              <li>
                <Link
                  href="/"
                  className="block text-white hover:opacity-80 transition-opacity font-bold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>

              {isAuthenticated && (
                <>
                  <li>
                    <Link
                      href="/bookings"
                      className="block text-white hover:opacity-80 transition-opacity font-bold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      className="block text-white hover:opacity-80 transition-opacity font-bold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/new_bookings"
                      className="block text-white hover:opacity-80 transition-opacity font-bold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Đăng ký phòng
                    </Link>
                  </li>
                    <li>
                      <Link
                        href="/timetable"
                        className="block text-white hover:opacity-80 transition-opacity font-bold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Thời khóa biểu
                      </Link>
                    </li>
                  {isAdmin && (
                    <li>
                      <Link
                        href="/admin"
                        className="block text-white hover:opacity-80 transition-opacity font-bold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    </li>
                  )}
                </>
              )}

              {isAuthenticated ? (
                <>
                  <li>
                    <Link
                      href="/spaces"
                      className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Find A Space
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="block text-white hover:opacity-80 transition-opacity font-bold text-left w-full"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href="/auth"
                    className="inline-block px-7 py-3 rounded-lg font-bold transition-all duration-300 bg-white text-black border-2 border-white hover:bg-white/10 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </header>
  )
}
