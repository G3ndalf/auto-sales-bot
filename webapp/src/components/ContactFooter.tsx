/**
 * ContactFooter.tsx — Sticky-футер с кнопками контактов.
 *
 * Используется в: CarAdDetail, PlateAdDetail.
 * Заменяет дублированный блок с "Показать" (телефон) + "Написать" (Telegram).
 */

import { motion } from 'framer-motion'
import { Phone, ChatSquare } from '@solar-icons/react'
import { formatPhone } from '../utils/format'
import { footerSpring } from '../constants/animations'

interface ContactFooterProps {
  /** Номер телефона (raw) */
  phone: string
  /** Telegram username автора (без @) */
  authorUsername?: string | null
}

export default function ContactFooter({ phone, authorUsername }: ContactFooterProps) {
  /** Показать номер: копируем в буфер + popup */
  const handlePhoneClick = () => {
    const formatted = formatPhone(phone)
    navigator.clipboard?.writeText(formatted).catch(() => {})

    const wa = window.Telegram?.WebApp
    if (wa?.showPopup) {
      wa.showPopup({
        title: 'Номер скопирован',
        message: formatted,
        buttons: [{ id: 'ok', type: 'default', text: 'OK' }],
      })
    } else {
      alert(formatted)
    }
  }

  /** Написать в Telegram */
  const handleTelegramClick = () => {
    if (!authorUsername) return
    const wa = window.Telegram?.WebApp
    const url = `https://t.me/${authorUsername}`
    if (wa?.openTelegramLink) {
      wa.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <motion.div
      className="detail-footer"
      variants={footerSpring}
      initial="hidden"
      animate="visible"
    >
      <button className="btn btn-gradient detail-footer__btn" onClick={handlePhoneClick}>
        <Phone size={18} weight="BoldDuotone" /> Показать
      </button>

      {authorUsername && (
        <button className="btn btn-secondary detail-footer__btn" onClick={handleTelegramClick}>
          <ChatSquare size={16} weight="BoldDuotone" /> Написать
        </button>
      )}
    </motion.div>
  )
}
