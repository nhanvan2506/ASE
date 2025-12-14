"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Logo } from "../landing/logo"
import { UserIcon, EnvelopeIcon, LockIcon } from "./auth-icons"
import { useMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/useAuth"
import type { RegisterRequest } from "@/schemas/api"

interface SignUpFormProps {
  onSwitchToSignIn: () => void
}

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [studentId, setStudentId] = useState("")
  const [department, setDepartment] = useState("")
  const [yearOfStudy, setYearOfStudy] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isMobile = useMobile()
  const { theme } = useTheme()
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !email || !password) {
      toast.error("Please fill in all required fields")
      return
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    setIsSubmitting(true)
    try {
      const registerData: RegisterRequest = {
        full_name: fullName,
        email,
        password,
        student_id: studentId || null,
        department: department || null,
        year_of_study: yearOfStudy ? parseInt(yearOfStudy) : null,
      }
      await register(registerData)
      // Navigation handled by useAuth hook
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const logoColor = theme === "dark" ? "white" : "currentColor"

  return (
    <form
      onSubmit={handleSubmit}
      className="h-full flex flex-col items-center justify-center px-[70px] text-center bg-background"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10 text-foreground">
        <Logo className="w-[30px] h-[30px]" color={logoColor} />
        <span
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
        >
          SCAMS
        </span>
      </Link>

      {/* Title */}
      <h1
        className="text-5xl font-bold mb-8 text-foreground"
        style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
      >
        First time here?
      </h1>

      {/* Full Name */}
      <div className="relative mb-5 w-full">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <UserIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full py-4 px-5 pl-[50px] bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
        />
      </div>

      {/* Email Input */}
      <div className="relative mb-5 w-full">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <EnvelopeIcon className="w-5 h-5" />
        </div>
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full py-4 px-5 pl-[50px] bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
        />
      </div>

      {/* Password Input */}
      <div className="relative mb-5 w-full">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <LockIcon className="w-5 h-5" />
        </div>
        <input
          type="password"
          placeholder="Password (min. 8 characters) *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full py-4 px-5 pl-[50px] bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
        />
      </div>

      {/* Student ID (Optional) */}
      <div className="relative mb-5 w-full">
        <input
          type="text"
          placeholder="Student ID (optional)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full py-4 px-5 bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
        />
      </div>

      {/* Department and Year Row */}
      <div className="flex flex-col md:flex-row gap-4 w-full mb-5">
        {/* Department (Optional) */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Department (optional)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full py-4 px-5 bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
          />
        </div>

        {/* Year of Study (Optional) */}
        <div className="relative flex-1">
          <select
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value)}
            className="w-full py-4 px-5 bg-muted border-none rounded-lg text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
          >
            <option value="">Year (optional)</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
            <option value="5">Year 5</option>
            <option value="6">Year 6</option>
            <option value="7">Year 7</option>
          </select>
        </div>
      </div>

      {/* Sign Up Button */}
      <button
        type="submit"
        disabled={isSubmitting || !fullName || !email || !password || password.length < 8}
        className="mt-4 px-11 py-4 rounded-lg font-bold uppercase tracking-wider transition-all active:scale-95 bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-foreground disabled:hover:text-background"
      >
        {isSubmitting ? "Creating Account..." : "Sign Up"}
      </button>

      {/* Mobile Only - Switch to Sign In */}
      {isMobile && (
        <p className="mt-6 text-sm text-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-bold hover:opacity-80 transition-opacity"
          >
            Sign In
          </button>
        </p>
      )}
    </form>
  )
}