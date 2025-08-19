import Link from "next/link"

import { cn } from "@/lib/utils"

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn("relative bottom-0 z-40 border-t bg-background", className)}
    >
      <div className="container flex h-14 items-center justify-center text-sm">
        Developed under the KP Government Innovation Fellowship Program, supported by the {" "}
        by{" "}
        <Link
          href="https://www.kpitb.gov.pk/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-medium underline underline-offset-4 hover:text-primary"
        >
          KP Information Technology Board
        </Link>
        <Link
          href="https://codeforpakistan.org"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-medium underline underline-offset-4 hover:text-primary"
        >
          and Code for Pakistan.
        </Link>
      </div>
    </footer>
  )
}
