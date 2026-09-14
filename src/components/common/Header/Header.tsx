import { useState } from "react"
import { ExamEvaluateLogo } from "./Logo"
import { UserIcon, LockIcon, LogOutIcon } from "../Icons"
import { getHomeScreen } from "@/utils/roleUtils"

export function Header({
  user,
  onNavigate,
  onLogout,
}: {
  user: { name: string; role: string; email: string }
  onNavigate: (s: any) => void
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-[#0F2142] border-b border-white/10 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Clickable Logo */}
        <button
          onClick={() => onNavigate(getHomeScreen(user.role))}
          className="cursor-pointer focus:outline-none"
          aria-label="Go to Dashboard"
        >
          <ExamEvaluateLogo size="sm" inverse />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-white text-sm font-medium leading-tight">
              {user.name}
            </span>
            <span className="text-blue-300 text-xs">
              {user.role} · {user.email}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-[#3B5DE8] text-white text-sm font-bold hover:bg-[#2A3ECC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Account menu"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-20 animate-fade-in overflow-hidden">

                <button
                  onClick={() => {
                    onNavigate("profile")
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2"
                >
                  <UserIcon size={14} />
                  My Profile
                </button>

                <button
                  onClick={() => {
                    onNavigate("change-password")
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2"
                >
                  <LockIcon size={14} />
                  Change Password
                </button>

                <hr className="border-[#E2E8F0]" />

                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEE2E2] flex items-center gap-2"
                >
                  <LogOutIcon size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}