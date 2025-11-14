import type React from "react"
import Link from "next/link"
import { Home } from "lucide-react"

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <Home className="w-6 h-6" />
        </Link>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-cyan-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        <h1 className="text-2xl font-bold text-white tracking-wider">
          Stock Prompt <span className="text-cyan-400">Architect</span>
        </h1>
      </div>
    </header>
  )
}

export default Header
