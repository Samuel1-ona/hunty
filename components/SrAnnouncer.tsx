"use client"

import { useEffect, useState } from "react"

let setMessage: (msg: string) => void = () => {}

export function announceSr(message: string) {
  setMessage(message)
}

export function SrAnnouncer() {
  const [message, setMessageState] = useState("")

  useEffect(() => {
    setMessage = setMessageState
    return () => {
      setMessage = () => {}
    }
  }, [])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
