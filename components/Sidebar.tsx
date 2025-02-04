'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ComputerDesktopIcon, BeakerIcon, FolderIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'
import Cookies from 'js-cookie'

export default function Sidebar() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
      
      // Clear token from cookie
      Cookies.remove('token')
      
      // Redirect to login
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r h-screen">
      <div className="flex-1 flex flex-col pt-5 pb-4">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          <Link
            href="/"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <ComputerDesktopIcon className="mr-3 h-6 w-6" />
            Bots
          </Link>

          <Link
            href="/test"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <BeakerIcon className="mr-3 h-6 w-6" />
            Test
          </Link>

          <Link
            href="/files"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <FolderIcon className="mr-3 h-6 w-6" />
            Files
          </Link>
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
        >
          <ArrowLeftOnRectangleIcon className="mr-3 h-6 w-6" />
          Logout
        </button>
      </div>
    </div>
  )
} 