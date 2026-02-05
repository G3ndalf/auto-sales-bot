/**
 * SellerBlock.tsx — Блок информации о продавце.
 *
 * Используется в: CarAdDetail, PlateAdDetail.
 * Показывает: имя продавца, дату регистрации, количество объявлений.
 */

import { motion } from 'framer-motion'
import { User, ClipboardList, CalendarMinimalistic } from '@solar-icons/react'
import { detailItem } from '../constants/animations'
import { THEME } from '../constants/theme'

interface SellerBlockProps {
  /** Имя продавца */
  name: string | null
  /** Дата регистрации (форматированная строка) */
  since: string | null
  /** Количество активных объявлений */
  adsCount: number
}

export default function SellerBlock({ name, since, adsCount }: SellerBlockProps) {
  if (!name) return null

  return (
    <motion.div
      variants={detailItem}
      style={{
        padding: '0 20px',
        marginTop: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
          border: `1px solid ${THEME.border}`,
          borderRadius: 16,
          padding: '16px 18px',
        }}
      >
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: THEME.textMuted,
            margin: '0 0 12px 0',
          }}
        >
          Продавец
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Аватар */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: THEME.accentDim,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
              fontWeight: 700,
              color: THEME.accent,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          {/* Инфо */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: THEME.text,
                lineHeight: 1.3,
              }}
            >
              {name}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 12px',
                marginTop: 4,
              }}
            >
              {since && (
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.textSecondary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CalendarMinimalistic size={12} weight="BoldDuotone" />
                  с {since}
                </span>
              )}

              <span
                style={{
                  fontSize: 12,
                  color: THEME.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ClipboardList size={12} weight="BoldDuotone" />
                {adsCount} {adsCount === 1 ? 'объявление' : adsCount < 5 ? 'объявления' : 'объявлений'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
