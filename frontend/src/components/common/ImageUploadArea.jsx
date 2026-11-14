import React, { useRef, useState } from 'react'
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  FileText,
  Trash2,
  Plus,
  AlertCircle,
} from 'lucide-react'

/**
 * Format file bytes into human readable string
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Reusable Image and Document File Upload Area
 *
 * @param {Array} items - Array of { id, file, preview, name, size, caption }
 * @param {Function} onChange - (newItems) => void
 * @param {number} maxFiles - Maximum allowed files (default 5)
 * @param {string} accept - Accepted mime types (default "image/*")
 * @param {boolean} allowCaption - Allow user to provide a caption for each file
 * @param {string} label - Input label
 * @param {string} helperText - Instruction text below the dropzone
 * @param {boolean} compact - Compact layout (for chat or small forms)
 */
export default function ImageUploadArea({
  items = [],
  onChange,
  maxFiles = 5,
  accept = 'image/*',
  allowCaption = false,
  label = 'Upload Supporting Images / Documents',
  helperText = 'PNG, JPG, WEBP, or PDF up to 15MB each.',
  compact = false,
}) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return
    setErrorMessage('')

    const incoming = Array.from(fileList)
    const availableSlots = maxFiles - items.length

    if (availableSlots <= 0) {
      setErrorMessage(`Maximum limit of ${maxFiles} files reached.`)
      return
    }

    const filesToProcess = incoming.slice(0, availableSlots)
    const newItems = []

    for (const file of filesToProcess) {
      // 15MB limit check
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 15MB size limit.`)
        continue
      }

      const isImage = file.type.startsWith('image/')
      const preview = isImage ? URL.createObjectURL(file) : ''

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        name: file.name,
        size: file.size,
        fileType: file.type || 'image/jpeg',
        caption: '',
      })
    }

    if (newItems.length > 0) {
      onChange?.([...items, ...newItems])
    }

    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer?.files) {
      handleFilesSelected(e.dataTransfer.files)
    }
  }

  const handleRemove = (idToRemove) => {
    const item = items.find((it) => it.id === idToRemove)
    if (item?.preview && item.preview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.preview)
      } catch (_) {}
    }
    onChange?.(items.filter((it) => it.id !== idToRemove))
  }

  const handleCaptionChange = (idToUpdate, newCaption) => {
    onChange?.(
      items.map((it) => (it.id === idToUpdate ? { ...it, caption: newCaption } : it))
    )
  }

  return (
    <div className="w-full space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-main flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
            <span>{label}</span>
          </label>
          <span className="text-[11px] font-medium text-text-muted">
            {items.length} / {maxFiles} files
          </span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        accept={accept}
        className="hidden"
        multiple={maxFiles > 1}
        onChange={(e) => handleFilesSelected(e.target.files)}
        ref={fileInputRef}
        type="file"
      />

      {/* Drop / Browse Area (shown if slots available) */}
      {items.length < maxFiles && (
        <div
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            compact ? 'p-3 text-center' : 'p-5 text-center'
          } ${
            dragOver
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border/80 bg-background/50 hover:border-primary/60 hover:bg-surface-muted/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-border shadow-xs text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-primary hover:underline">
                Click to browse
              </span>{' '}
              <span className="text-text-muted">or drag & drop images</span>
            </div>
            {helperText && (
              <p className="text-[11px] text-text-muted max-w-sm">{helperText}</p>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File Previews Grid */}
      {items.length > 0 && (
        <div
          className={`grid gap-2.5 ${
            compact
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {items.map((item, idx) => {
            const isImg =
              item.preview ||
              (item.fileType && item.fileType.startsWith('image/')) ||
              (item.url && !item.url.endsWith('.pdf'))

            return (
              <div
                className="group relative flex flex-col rounded-2xl border border-border/80 bg-surface p-2 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
                key={item.id || idx}
              >
                <div className="flex items-start gap-2.5">
                  {/* Thumbnail / Icon */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-background">
                    {isImg && (item.preview || item.url) ? (
                      <img
                        alt={item.name}
                        className="h-full w-full object-cover"
                        src={item.preview || item.url}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-muted">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* File Metadata */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-semibold text-text-main truncate" title={item.name}>
                      {item.name || `Attachment ${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatFileSize(item.size)}
                    </p>
                    <span className="inline-block mt-1 rounded bg-surface-muted px-1.5 py-0.2 text-[9px] font-mono text-text-muted">
                      Ready to upload
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg text-text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={() => handleRemove(item.id)}
                    title="Remove file"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Optional Caption Field */}
                {allowCaption && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <input
                      className="w-full rounded-lg border border-border/70 bg-background/50 px-2 py-1 text-[11px] text-text-main placeholder:text-text-muted outline-none focus:border-secondary focus:bg-surface"
                      onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                      placeholder="Add caption (e.g., Torn seam, packaging label)..."
                      type="text"
                      value={item.caption || ''}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
