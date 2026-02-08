/**
 * PhotoEditor.tsx — Редактор фотографий существующего объявления.
 *
 * Загружает фото через GET /api/ads/{ad_type}/{ad_id}/photos,
 * показывает сетку с превью, позволяет удалять и добавлять фото.
 */

import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import type { AdPhotoItem } from '../api'
import { CONFIG } from '../constants/config'

interface Props {
  adType: 'car' | 'plate'
  adId: number
}

export default function PhotoEditor({ adType, adId }: Props) {
  const [photos, setPhotos] = useState<AdPhotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxPhotos = adType === 'car' ? CONFIG.MAX_CAR_PHOTOS : CONFIG.MAX_PLATE_PHOTOS

  useEffect(() => {
    let cancelled = false
    api.getAdPhotos(adType, adId)
      .then(data => { if (!cancelled) setPhotos(data) })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить фото') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [adType, adId])

  const handleDelete = async (photoId: number) => {
    if (!confirm('Удалить это фото?')) return
    try {
      await api.deleteAdPhoto(adType, adId, photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch {
      setError('Не удалось удалить фото')
    }
  }

  const handleAdd = async (files: FileList) => {
    const remaining = maxPhotos - photos.length
    const toUpload = Array.from(files).slice(0, remaining)

    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) continue

      setUploading(true)
      setError(null)
      try {
        const newPhoto = await api.addAdPhoto(adType, adId, file)
        setPhotos(prev => [...prev, newPhoto])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      } finally {
        setUploading(false)
      }
    }
  }

  const canAddMore = photos.length < maxPhotos

  // ── Styles ──

  const containerStyle: React.CSSProperties = {
    marginBottom: '12px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#F59E0B',
    marginBottom: '8px',
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  }

  const thumbStyle: React.CSSProperties = {
    aspectRatio: '1',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    background: '#1A1F2E',
    border: '1px solid rgba(245, 158, 11, 0.15)',
  }

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  const removeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    background: 'rgba(239, 68, 68, 0.85)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  }

  const addBtnStyle: React.CSSProperties = {
    aspectRatio: '1',
    borderRadius: '12px',
    background: '#1A1F2E',
    border: '2px dashed rgba(245, 158, 11, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: uploading ? 'wait' : 'pointer',
    color: '#F59E0B',
    fontSize: '0.8em',
    opacity: uploading ? 0.5 : 1,
  }

  const hintStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: '6px',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#EF4444',
    marginTop: '6px',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Фотографии</span>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Загрузка...</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Фотографии</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) handleAdd(e.target.files)
          e.target.value = ''
        }}
      />

      <div style={gridStyle}>
        {photos.map(photo => (
          <div key={photo.id} style={thumbStyle}>
            <img src={api.photoUrl(photo.file_id)} alt="" style={imgStyle} />
            <button
              style={removeBtnStyle}
              onClick={() => handleDelete(photo.id)}
            >
              ×
            </button>
          </div>
        ))}
        {canAddMore && (
          <div
            style={addBtnStyle}
            onClick={() => !uploading && inputRef.current?.click()}
          >
            <span style={{ fontSize: '28px', lineHeight: 1, marginBottom: '4px' }}>+</span>
            <span>{uploading ? '...' : 'Фото'}</span>
          </div>
        )}
      </div>

      <p style={hintStyle}>
        {photos.length}/{maxPhotos} · JPG, PNG, WebP · до 5МБ
      </p>

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  )
}
