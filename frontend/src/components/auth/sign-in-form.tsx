"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Logo } from "../landing/logo"
import { EnvelopeIcon, LockIcon } from "./auth-icons"
import { useMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/useAuth"

interface SignInFormProps {
  onSwitchToSignUp: () => void
}

export function SignInForm({ onSwitchToSignUp }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isMobile = useMobile()
  const { theme } = useTheme()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)
      // Navigation handled by useAuth hook
    } catch (err: any) {
      toast.error(err.message || "Login failed. Please check your credentials.")
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
        Welcome back!
      </h1>

      {/* Email Input */}
      <div className="relative mb-5 w-full">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <EnvelopeIcon className="w-5 h-5" />
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full py-4 px-5 pl-[50px] bg-muted border-none rounded-lg text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontFamily: 'var(--font-body, Roboto, sans-serif)' }}
        />
      </div>

      {/* Forgot Password Link */}
      <Link
        href="#"
        className="text-sm text-foreground hover:opacity-80 transition-opacity my-4"
      >
        Forgot your password?
      </Link>

      {/* Sign In Button */}
      <button
        type="submit"
        disabled={isSubmitting || !email || !password}
        className="mt-4 px-11 py-4 rounded-lg font-bold uppercase tracking-wider transition-all active:scale-95 bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-foreground disabled:hover:text-background"
      >
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>

      {/* Mobile Only - Switch to Sign Up */}
      {isMobile && (
        <p className="mt-6 text-sm text-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-bold hover:opacity-80 transition-opacity"
          >
            Sign Up
          </button>
        </p>
      )}
    </form>
  )
}