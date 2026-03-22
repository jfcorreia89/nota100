'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { updateAvatar } from '@/app/actions/profile'
import { getInitials } from '@/lib/utils'

interface Props {
  name: string
  avatarUrl: string | null
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = 200
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, size, size,
  )

  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function AvatarUpload({ name, avatarUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localAvatar, setLocalAvatar] = useState(avatarUrl)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function openFile(camera: boolean) {
    if (camera) {
      cameraInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setModalOpen(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  async function handleSave() {
    if (!imageSrc || !croppedArea) return
    setSaving(true)
    setError(null)
    try {
      const base64 = await getCroppedImg(imageSrc, croppedArea)
      const result = await updateAvatar(base64)
      if (result.error) {
        setError(result.error)
      } else {
        setLocalAvatar(base64)
        setModalOpen(false)
      }
    } catch {
      setError('Erro ao guardar foto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar + picker buttons */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {localAvatar ? (
            <img
              src={localAvatar}
              alt={name}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: '3px solid #E0F2FC' }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              {getInitials(name)}
            </div>
          )}
          {/* Camera badge */}
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[#D4E8F2] flex items-center justify-center text-sm shadow-sm cursor-pointer"
            onClick={() => openFile(false)}
          >
            📷
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openFile(true)}
            className="text-xs text-[#0369A1] font-medium px-3 py-1.5 rounded-lg bg-[#E0F2FC]"
          >
            📷 Câmara
          </button>
          <button
            onClick={() => openFile(false)}
            className="text-xs text-[#0369A1] font-medium px-3 py-1.5 rounded-lg bg-[#E0F2FC]"
          >
            🖼 Galeria
          </button>
        </div>
      </div>

      {/* Crop modal */}
      {modalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Cropper area */}
          <div className="relative flex-1">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="bg-[#0C2233] px-6 pt-4 pb-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-white text-xs opacity-60">−</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#06B6D4]"
              />
              <span className="text-white text-xs opacity-60">+</span>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #024F82, #06B6D4)' }}
              >
                {saving ? 'A guardar…' : 'Cortar e guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
