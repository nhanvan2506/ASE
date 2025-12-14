import Link from "next/link"
import { Logo } from "./logo"
import { FacebookIcon, LinkedInIcon, InstagramIcon } from "./icons"

export function Footer() {
  return (
    <footer className="bg-muted text-foreground py-14">
      <div className="container max-w-[1100px] mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-start">
          {/* Brand */}
          <div className="flex flex-col gap-2.5 md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-foreground mb-2">
              <Logo className="w-[30px] h-[30px]" color="currentColor" />
              <span style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}>
                SCAMS
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              &copy; 2025 SCAMS. All rights reserved.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-lg md:text-xl mb-3 font-bold"
              style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
            >
              Contact
            </h4>
            <p className="leading-relaxed mb-2.5 text-sm text-muted-foreground">
              Email: support@studyspace.com
            </p>
            <p className="leading-relaxed mb-2.5 text-sm text-muted-foreground">
              Phone: 123-456-789
            </p>
          </div>

          {/* Social Links */}
          <div>
            <h4
              className="text-lg md:text-xl mb-3 font-bold"
              style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
            >
              Social links
            </h4>
            <div className="flex gap-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-6 h-6" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="w-6 h-6" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}