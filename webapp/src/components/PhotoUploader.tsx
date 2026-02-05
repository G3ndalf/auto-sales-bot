/**
 * PhotoUploader.tsx — Компонент загрузки фотографий в форме объявления.
 *
 * Позволяет выбрать фото из галереи, загрузить на сервер,
 * показать превью и удалить ненужные.
 * Inline styles чтобы не конфликтовать с App.css.
 */

import { useState, useRef } from 'react'
import { uploadPhoto } from '../api'

/** Элемент фото в локальном состоянии компонента */
interface PhotoItem {
  /** Уникальный ID для отслеживания в UI */
  localId: string;
  /** ID фото на сервере (loc_uuid) или null если ещё грузится */
  id: string | null;
  /** Data URL для превью (из FileReader) */
  preview: string;
  /** Идёт загрузка */
  uploading: boolean;
  /** Ошибка загрузки */
  error: string | null;
}

/** Props компонента PhotoUploader */
interface Props {
  /** Максимальное количество фото (10 для авто, 5 для номеров) */
  maxPhotos: number;
  /** Массив photo_id уже загруженных фото (управляется родителем) */
  photoIds: string[];
  /** Callback при изменении массива photo_ids */
  onPhotosChange: (ids: string[]) => void;
}

/**
 * Компонент загрузки фотографий.
 *
 * Показывает сетку превью (3 колонки), кнопку «+» для добавления,
 * индикатор загрузки и кнопку удаления на каждом фото.
 * Все стили inline — не конфликтует с App.css.
 */
export default function PhotoUploader({ maxPhotos, photoIds, onPhotosChange }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Обработка выбранных файлов.
   * Для каждого файла: валидация → превью → загрузка на сервер.
   */
  const handleFiles = async (files: FileList) => {
    const remaining = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      // Валидация типа на клиенте
      if (!file.type.startsWith('image/')) continue;
      // Валидация размера (5 МБ)
      if (file.size > 5 * 1024 * 1024) {
        continue;
      }

      // Создать превью через FileReader
      const preview = await readFileAsDataURL(file);

      // Добавить в список с состоянием "загружается"
      const tempItem: PhotoItem = {
        localId: Math.random().toString(36).slice(2),
        id: null,
        preview,
        uploading: true,
        error: null,
      };

      setPhotos(prev => {
        const updated = [...prev, tempItem];
        return updated;
      });

      // Загрузить на сервер
      try {
        const photoId = await uploadPhoto(file);

        setPhotos(prev => {
          const updated = prev.map(p =>
            p.localId === tempItem.localId ? { ...p, id: photoId, uploading: false } : p
          );
          // Обновить родительский массив photo_ids
          const ids = updated.filter(p => p.id).map(p => p.id!);
          onPhotosChange(ids);
          return updated;
        });
      } catch (e) {
        setPhotos(prev =>
          prev.map(p =>
            p.localId === tempItem.localId
              ? { ...p, uploading: false, error: e instanceof Error ? e.message : 'Ошибка' }
              : p
          )
        );
      }
    }
  };

  /** Удалить фото по индексу и обновить родительский массив */
  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const ids = updated.filter(p => p.id).map(p => p.id!);
      onPhotosChange(ids);
      return updated;
    });
  };

  const canAddMore = photos.length < maxPhotos;

  // ── Стили (inline чтобы не конфликтовать с App.css) ──

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '8px',
  };

  const thumbStyle: React.CSSProperties = {
    aspectRatio: '1',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    background: 'var(--secondary-bg, #e8eaed)',
    border: '1px solid var(--border, rgba(0,0,0,0.06))',
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const removeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  };

  const addBtnStyle: React.CSSProperties = {
    aspectRatio: '1',
    borderRadius: '12px',
    background: 'var(--bg, #f0f2f5)',
    border: '2px dashed var(--border-input, rgba(0,0,0,0.12))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--hint, #6b7280)',
    fontSize: '0.8em',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8em',
    zIndex: 1,
  };

  const errorOverlayStyle: React.CSSProperties = {
    ...overlayStyle,
    background: 'rgba(239,68,68,0.7)',
    fontSize: '0.7em',
    padding: '4px',
    textAlign: 'center',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--text, #1a1a2e)',
    marginBottom: '6px',
    opacity: 0.7,
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '0.8em',
    color: 'var(--hint, #6b7280)',
    marginTop: '6px',
  };

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>📸 Фотографии</label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = ''; // сбросить чтобы можно было выбрать тот же файл
        }}
      />

      <div style={gridStyle}>
        {photos.map((photo, i) => (
          <div key={photo.localId} style={thumbStyle}>
            <img src={photo.preview} alt="" style={imgStyle} />
            {photo.uploading && (
              <div style={overlayStyle}>⏳</div>
            )}
            {photo.error && (
              <div style={errorOverlayStyle}>{photo.error}</div>
            )}
            {!photo.uploading && (
              <button style={removeBtnStyle} onClick={() => removePhoto(i)}>×</button>
            )}
          </div>
        ))}
        {canAddMore && (
          <div style={addBtnStyle} onClick={() => inputRef.current?.click()}>
            <span style={{ fontSize: '28px', lineHeight: 1, marginBottom: '4px' }}>+</span>
            <span>Фото</span>
          </div>
        )}
      </div>

      <p style={hintStyle}>
        {photos.length}/{maxPhotos} · JPG, PNG, WebP · до 5МБ
      </p>
    </div>
  );
}

/**
 * Прочитать файл как Data URL для превью.
 * Используется для мгновенного отображения миниатюры до завершения загрузки.
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
