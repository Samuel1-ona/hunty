"use client"

import { Button } from "@hunty/ui"
import { useState } from "react"

import { type CreatorLink,getCreatorProfile, setCreatorProfile } from "@/lib/creatorProfiles"

interface CreatorProfileSettingsProps {
  address: string
}

export function CreatorProfileSettings({ address }: CreatorProfileSettingsProps) {
  const [bio, setBio] = useState(() => getCreatorProfile(address)?.bio ?? "")
  const [links, setLinks] = useState<CreatorLink[]>(() => getCreatorProfile(address)?.links ?? [])
  const [saved, setSaved] = useState(false)

  function save() {
    setCreatorProfile(address, { bio: bio.trim(), links: links.filter((link) => link.title && link.url) })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
      <summary aria-label="Edit creator profile" className="cursor-pointer font-semibold text-slate-900">Edit creator profile</summary>
      <div className="mt-4 space-y-3">
        <label htmlFor="creator-bio" className="block text-sm font-medium text-slate-700">
          Bio
          <textarea
            aria-label="Creator bio"
            id="creator-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>
        {links.map((link, index) => (
          <div className="flex gap-2" key={`${index}-${link.title}`}>
            <input
              aria-label="Link title"
              value={link.title}
              onChange={(event) => setLinks((current) => current.map((item, i) => i === index ? { ...item, title: event.target.value } : item))}
              placeholder="Link title"
              className="w-1/3 rounded-lg border border-slate-300 p-2 text-sm"
            />
            <input
              aria-label="Link URL"
              value={link.url}
              onChange={(event) => setLinks((current) => current.map((item, i) => i === index ? { ...item, url: event.target.value } : item))}
              placeholder="https://example.com"
              className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
              type="url"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button label="Add link" variant="outline" onClick={() => setLinks((current) => [...current, { title: "", url: "" }])}>Add link</Button>
          <Button label="Save profile" onClick={save}>Save profile</Button>
          {saved && <span className="self-center text-sm text-emerald-700">Saved</span>}
        </div>
      </div>
    </details>
  )
}