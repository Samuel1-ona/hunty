"use client"

import { Camera, Loader2, MapPin, QrCode, X } from "lucide-react"
import { FormEvent, useEffect, useRef, useState } from "react"

import { Button } from "@hunty/ui"
import { Input } from "@/components/ui/input"
import type { ClueChoiceOption } from "@/lib/types"
import type { ClueSubmission } from "@/lib/clueTypeSystem"

interface ClueTypeInputProps {
  type: "location" | "qr" | "multiple-choice"
  disabled?: boolean
  isPending?: boolean
  geofenceRadiusMeters?: number
  options?: ClueChoiceOption[]
  onSubmit: (submission: ClueSubmission) => void | Promise<void>
}

type BarcodeResult = { rawValue?: string }
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]>
}
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

function requestBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("GPS is not available in this browser."))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enable it to complete this clue."
            : "Unable to read your GPS location. Check location services and try again."
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  })
}

export function ClueTypeInput({
  type,
  disabled = false,
  isPending = false,
  geofenceRadiusMeters = 100,
  options = [],
  onSubmit,
}: ClueTypeInputProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)
  const scanTokenRef = useRef(0)

  const stopCamera = () => {
    scanTokenRef.current += 1
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScannerOpen(false)
  }

  useEffect(() => stopCamera, [])

  const startQrScanner = async () => {
    setError("")
    const Detector = (
      window as typeof window & {
        BarcodeDetector?: BarcodeDetectorConstructor
      }
    ).BarcodeDetector

    if (!Detector) {
      setError("QR scanning is not supported by this browser. Enter the payload manually.")
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available. Enter the QR payload manually.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      setScannerOpen(true)
      setStatus("Position the QR code inside the frame")

      const video = videoRef.current
      if (!video) {
        stopCamera()
        return
      }
      video.srcObject = stream
      await video.play()

      let detector: BarcodeDetectorLike
      try {
        detector = new Detector({ formats: ["qr"] })
      } catch {
        detector = new Detector()
      }

      const token = ++scanTokenRef.current
      const scan = async () => {
        if (token !== scanTokenRef.current || !videoRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          const value = results.find((result) => result.rawValue?.trim())?.rawValue
          if (value) {
            stopCamera()
            setQrValue(value)
            setStatus("QR code captured")
            await onSubmit({ answer: value })
            return
          }
        } catch {
          // A frame can fail while the camera is focusing; keep scanning.
        }
        scanTimerRef.current = window.setTimeout(() => void scan(), 200)
      }
      await scan()
    } catch (cameraError) {
      stopCamera()
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Unable to open the camera. Enter the QR payload manually."
      )
    }
  }

  if (type === "location") {
    const checkLocation = async () => {
      setError("")
      setStatus("Finding your location…")
      try {
        const location = await requestBrowserLocation()
        setStatus("Location received. Checking the clue area…")
        await onSubmit({ answer: "", location })
      } catch (locationError) {
        setStatus("")
        setError(
          locationError instanceof Error
            ? locationError.message
            : "Unable to check your location."
        )
      }
    }

    return (
      <div className="w-full space-y-3" data-testid="location-clue-input">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-left text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Arrive within {Math.round(geofenceRadiusMeters)} metres of the hidden
            checkpoint, then check your GPS position.
          </p>
        </div>
        {status && (
          <p className="text-center text-xs text-slate-500" role="status" aria-live="polite">
            {status}
          </p>
        )}
        {error && (
          <p className="text-center text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        <Button
          type="button"
          className="w-full bg-gradient-to-b from-[#39A437] to-[#194F0C] text-white"
          onClick={() => void checkLocation()}
          disabled={disabled || isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {isPending ? "Checking location…" : "Check my location"}
        </Button>
      </div>
    )
  }

  if (type === "multiple-choice") {
    const submitChoice = (event: FormEvent) => {
      event.preventDefault()
      if (!selectedOptionId) {
        setError("Select an answer before submitting.")
        return
      }
      setError("")
      void onSubmit({ answer: selectedOptionId })
    }

    return (
      <form className="w-full space-y-3" data-testid="multiple-choice-input" onSubmit={submitChoice}>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
            Choose one answer
          </legend>
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:bg-sky-950/30"
            >
              <input
                type="radio"
                name={`clue-choice-${option.id}`}
                value={option.id}
                aria-label={`Choose ${option.label}`}
                checked={selectedOptionId === option.id}
                onChange={() => setSelectedOptionId(option.id)}
                disabled={disabled || isPending}
                className="text-sky-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{option.label}</span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="text-center text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white"
          disabled={disabled || isPending || !selectedOptionId}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit answer
        </Button>
      </form>
    )
  }

  const submitQr = (event: FormEvent) => {
    event.preventDefault()
    if (!qrValue.trim()) {
      setError("Scan a QR code or enter its payload manually.")
      return
    }
    setError("")
    void onSubmit({ answer: qrValue })
  }

  return (
    <div className="w-full space-y-3" data-testid="qr-clue-input">
      {scannerOpen && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-64 w-full object-cover"
            aria-label="QR code camera preview"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Close QR scanner"
            className="absolute right-2 top-2"
            onClick={stopCamera}
          >
            <X className="h-4 w-4" />
          </Button>
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white" role="status">
            {status}
          </p>
        </div>
      )}
      <form className="space-y-2" onSubmit={submitQr}>
        <label htmlFor="qr-clue-payload" className="sr-only">
          QR code payload
        </label>
        <Input
          id="qr-clue-payload"
          value={qrValue}
          onChange={(event) => {
            setQrValue(event.target.value)
            setError("")
          }}
          placeholder="Scan or enter QR payload"
          disabled={disabled || isPending}
        />
        {error && (
          <p className="text-center text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => void startQrScanner()}
            disabled={disabled || isPending || scannerOpen}
          >
            <Camera className="h-4 w-4" />
            Scan QR
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white"
            disabled={disabled || isPending || !qrValue.trim()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Submit code
          </Button>
        </div>
      </form>
    </div>
  )
}
