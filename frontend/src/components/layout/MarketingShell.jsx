import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function MarketingShell({ children }) {
  return (
    <div className="min-h-screen text-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
      <Footer />
    </div>
  )
}
