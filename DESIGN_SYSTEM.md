# 🎨 DESIGN SYSTEM — Авто СКФО

> **Версия:** 2.0  
> **Последнее обновление:** 2026-02-05  
> **Автор:** UI/UX Design System  
> **Стек:** React + TypeScript + Vite + Tailwind CSS v4 + Framer Motion

---

## Содержание

1. [Общая концепция](#1-общая-концепция)
2. [Цветовая палитра](#2-цветовая-палитра)
3. [Типографика](#3-типографика)
4. [Фоны и декор](#4-фоны-и-декор)
5. [Компоненты](#5-компоненты)
6. [Страницы](#6-страницы)
7. [Анимации](#7-анимации)
8. [Специфика Telegram Mini App](#8-специфика-telegram-mini-app)
9. [Имплементация](#9-имплементация)

---

## 1. Общая концепция

### 1.1 Название стиля

**«Caucasus Premium Dark»** — тёмная премиальная тема с тёплыми золотыми акцентами.

Ключевые слова: *уверенность, статус, скорость, доверие, Кавказ*.

### 1.2 Mood Board

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   🌙 Тёмный фон — глубокий, не чисто чёрный    │
│   🏔️ Горы Кавказа — величие, масштаб           │
│   ✨ Золото/янтарь — премиум, роскошь           │
│   🚗 Скорость — динамика, движение              │
│   🔥 Тёплые акценты — энергия, характер         │
│                                                 │
│   Не: аляповатый, детский, плоский              │
│   Да: дерзкий, стильный, дорогой                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 1.3 Вдохновение

| Приложение | Что берём |
|---|---|
| **Auto.ru** (тёмная тема) | Карточки авто, структура каталога, информационная плотность |
| **Avito Pro** | Чистый UI, система статусов, формы подачи |
| **CarGurus** | Gradient hero-секции, ценовые бейджи |
| **Porsche Finder** | Премиум dark theme, типографика, анимации |
| **Yandex Go** | Мобильная навигация, российский дизайн-язык |

### 1.4 Принцип: фиксированная тема

**ВАЖНО:** Приложение НЕ зависит от `--tg-theme-*` переменных. Мы принудительно устанавливаем собственную тему.

```css
/* УБИРАЕМ все var(--tg-theme-*) зависимости */
/* Фиксированные цвета для ВСЕХ пользователей */
:root {
  color-scheme: dark;
}
```

---

## 2. Цветовая палитра

### 2.1 Core Colors

```
┌──────────────────────────────────────────────────────┐
│  BACKGROUNDS                                         │
│                                                      │
│  bg-primary     #0B0F19   ████  Основной фон        │
│  bg-secondary   #111827   ████  Карточки, панели     │
│  bg-tertiary    #1F2937   ████  Поля ввода, hover    │
│  bg-elevated    #1A2332   ████  Приподнятые блоки    │
│                                                      │
│  ACCENT / PRIMARY                                    │
│                                                      │
│  primary        #F59E0B   ████  Янтарный (кнопки)   │
│  primary-hover  #D97706   ████  Hover state          │
│  primary-light  #FBBF24   ████  Лёгкий акцент       │
│  primary-muted  rgba(245,158,11,0.15)  Фон бейджа   │
│                                                      │
│  SECONDARY                                           │
│                                                      │
│  secondary      #3B82F6   ████  Синий (ссылки)      │
│  secondary-hover #2563EB  ████  Hover state          │
│  secondary-muted rgba(59,130,246,0.15) Фон бейджа   │
│                                                      │
│  TEXT                                                │
│                                                      │
│  text-primary   #F9FAFB   ████  Заголовки           │
│  text-secondary #9CA3AF   ████  Описания             │
│  text-muted     #6B7280   ████  Подсказки            │
│  text-inverted  #0B0F19   ████  На светлом фоне     │
│                                                      │
│  STATUS                                              │
│                                                      │
│  success        #10B981   ████  Одобрено             │
│  success-muted  rgba(16,185,129,0.15)  Фон          │
│  warning        #F59E0B   ████  На модерации         │
│  warning-muted  rgba(245,158,11,0.15)  Фон          │
│  error          #EF4444   ████  Ошибка               │
│  error-muted    rgba(239,68,68,0.15)   Фон          │
│  sold           #8B5CF6   ████  Продано              │
│  sold-muted     rgba(139,92,246,0.15)  Фон          │
│                                                      │
│  BORDER                                              │
│                                                      │
│  border-default rgba(255,255,255,0.08)               │
│  border-light   rgba(255,255,255,0.04)               │
│  border-focus   rgba(245,158,11,0.5)                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.2 CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg-primary: #0B0F19;
  --bg-secondary: #111827;
  --bg-tertiary: #1F2937;
  --bg-elevated: #1A2332;

  /* Primary (Amber/Gold) */
  --primary: #F59E0B;
  --primary-hover: #D97706;
  --primary-light: #FBBF24;
  --primary-muted: rgba(245, 158, 11, 0.15);

  /* Secondary (Blue) */
  --secondary: #3B82F6;
  --secondary-hover: #2563EB;
  --secondary-muted: rgba(59, 130, 246, 0.15);

  /* Text */
  --text-primary: #F9FAFB;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;
  --text-inverted: #0B0F19;

  /* Status */
  --success: #10B981;
  --success-muted: rgba(16, 185, 129, 0.15);
  --warning: #F59E0B;
  --warning-muted: rgba(245, 158, 11, 0.15);
  --error: #EF4444;
  --error-muted: rgba(239, 68, 68, 0.15);
  --sold: #8B5CF6;
  --sold-muted: rgba(139, 92, 246, 0.15);

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-light: rgba(255, 255, 255, 0.04);
  --border-focus: rgba(245, 158, 11, 0.5);

  /* Shadows (для тёмной темы — мягкие) */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.35);
  --shadow-glow: 0 0 20px rgba(245, 158, 11, 0.15);
  --shadow-glow-blue: 0 0 20px rgba(59, 130, 246, 0.15);

  /* Radii */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%);
  --gradient-hero: linear-gradient(135deg, #0B0F19 0%, #1A2332 40%, #1E3A5F 100%);
  --gradient-hero-gold: linear-gradient(135deg, #1A1510 0%, #2D1F0E 50%, #1A2332 100%);
  --gradient-surface: linear-gradient(180deg, #111827 0%, #0B0F19 100%);
  --gradient-shimmer: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.08) 50%, transparent 100%);

  /* Transitions */
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 0.15s;
  --duration-normal: 0.25s;
  --duration-slow: 0.4s;
}
```

### 2.3 Tailwind CSS v4 Theme Config

```css
/* В index.css или app.css с Tailwind v4 */
@theme {
  --color-bg-primary: #0B0F19;
  --color-bg-secondary: #111827;
  --color-bg-tertiary: #1F2937;
  --color-bg-elevated: #1A2332;

  --color-primary: #F59E0B;
  --color-primary-hover: #D97706;
  --color-primary-light: #FBBF24;

  --color-accent: #3B82F6;
  --color-accent-hover: #2563EB;

  --color-text-primary: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;

  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-sold: #8B5CF6;
}
```

---

## 3. Типографика

### 3.1 Font Stack

```css
body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Display',
    'SF Pro Text',
    system-ui,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

> **Почему system fonts?** В Telegram Mini App нет надёжного доступа к Google Fonts. System fonts дают нативный feel и мгновенную загрузку. SF Pro на iOS = идеальный автомобильный look.

### 3.2 Шкала типографики

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| `display` | 32px / 2rem | 800 | 1.1 | Hero-заголовки |
| `title-lg` | 24px / 1.5rem | 800 | 1.2 | Заголовки страниц |
| `title` | 20px / 1.25rem | 700 | 1.3 | Секции |
| `subtitle` | 17px / 1.0625rem | 600 | 1.4 | Подзаголовки |
| `body` | 16px / 1rem | 400 | 1.5 | Основной текст |
| `body-medium` | 16px / 1rem | 500 | 1.5 | Акцентный текст |
| `caption` | 14px / 0.875rem | 500 | 1.4 | Метаданные |
| `small` | 12px / 0.75rem | 600 | 1.3 | Бейджи, метки |
| `price` | 22px / 1.375rem | 800 | 1.2 | Цены |

### 3.3 CSS Utility Classes

```css
.text-display {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.text-title-lg {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.text-title {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.text-subtitle {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.4;
}

.text-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-caption {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-secondary);
}

.text-small {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text-price {
  font-size: 1.375rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--primary);
}
```

---

## 4. Фоны и декор

### 4.1 Основной фон приложения

**Вариант A: Gradient Mesh (рекомендуется)**

Тёмный градиент с тёплым свечением — как ночной город сквозь лобовое стекло.

```css
body {
  background: #0B0F19;
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse 50% 50% at 0% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 50%);
  min-height: 100vh;
}
```

**Вариант B: Subtle Noise + Gradient**

Добавляет текстуру зернистости, как металлик авто.

```css
body {
  background: #0B0F19;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
    linear-gradient(180deg, #0B0F19 0%, #111827 50%, #0B0F19 100%);
}
```

**Вариант C: Geometric Pattern**

Тонкий геометрический паттерн (горы/шеврон) — отсылка к Кавказу.

```css
body {
  background-color: #0B0F19;
  background-image:
    linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%),
    linear-gradient(150deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%),
    linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%),
    linear-gradient(150deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%);
  background-size: 80px 140px;
  background-position: 0 0, 0 0, 40px 70px, 40px 70px;
}
```

### 4.2 Hero-фоны для секций

#### Главная (Home)

```css
.home-hero {
  background:
    radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245, 158, 11, 0.2) 0%, transparent 70%),
    linear-gradient(135deg, #111827 0%, #1A2332 40%, #1E3A5F 100%);
  position: relative;
  overflow: hidden;
}

/* Декоративный блюр-шар */
.home-hero::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -40px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(40px);
  animation: pulse-glow 4s ease-in-out infinite;
}

.home-hero::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: -30px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(40px);
  animation: pulse-glow 5s ease-in-out infinite reverse;
}
```

#### Каталог

```css
.catalog-hero {
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #0B0F19 0%, #1A2332 50%, #111827 100%);
}
```

#### Продать

```css
.sell-hero {
  background:
    radial-gradient(ellipse 80% 60% at 80% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #0B1A12 0%, #112820 40%, #111827 100%);
}
```

#### Профиль

```css
.profile-hero {
  background:
    radial-gradient(ellipse 70% 50% at 50% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #111827 0%, #1A1A3E 40%, #111827 100%);
}
```

#### Избранное

```css
.favorites-hero {
  background:
    radial-gradient(ellipse 80% 50% at 60% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #111827 0%, #2A1520 40%, #111827 100%);
}
```

#### Админ-панель

```css
.admin-hero {
  background:
    radial-gradient(ellipse 80% 50% at 30% 0%, rgba(245, 158, 11, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #0B0F19 0%, #1F2937 50%, #111827 100%);
}
```

### 4.3 Адаптивность фонов

```
iPhone SE (375×667):     hero height = 180px
iPhone 14 (390×844):     hero height = 200px
iPhone 15 Pro Max (430×932): hero height = 220px

Все радиальные градиенты используют % — автомасштаб.
```

---

## 5. Компоненты

### 5.1 Кнопки

#### Primary Button (Gold)

```
┌─────────────────────────────────────┐
│         🚗  Подать объявление       │  ← 48px height
└─────────────────────────────────────┘
     Amber gradient, white text
     Glow shadow, shimmer animation
```

```css
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  min-height: 48px;
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  color: #0B0F19;
  background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(245, 158, 11, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s ease;
}

/* Shimmer animation overlay */
.btn-primary::after {
  content: '';
  position: absolute;
  top: 0; left: -100%; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

.btn-primary:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary:disabled::after {
  display: none;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 200%; }
}
```

**Tailwind эквивалент:**
```html
<button class="flex items-center justify-center gap-2 w-full py-3.5 px-6 min-h-[48px]
  text-base font-bold text-[#0B0F19]
  bg-gradient-to-br from-[#FBBF24] via-[#F59E0B] to-[#D97706]
  border-none rounded-[14px] cursor-pointer relative overflow-hidden
  shadow-[0_4px_16px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
  active:scale-[0.97] active:shadow-[0_2px_8px_rgba(245,158,11,0.2)]
  disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
  transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
  🚗 Подать объявление
</button>
```

#### Secondary Button

```css
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  min-height: 48px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.btn-secondary:active {
  transform: scale(0.97);
  background: rgba(255, 255, 255, 0.08);
}
```

#### Danger Button

```css
.btn-danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  min-height: 48px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--error);
  background: var(--error-muted);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.btn-danger:active {
  transform: scale(0.97);
  background: rgba(239, 68, 68, 0.25);
}
```

#### Ghost Button

```css
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  min-height: 48px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--primary);
  background: transparent;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.btn-ghost:active {
  background: var(--primary-muted);
  transform: scale(0.97);
}
```

#### Кнопка-иконка (Favorite, Share, etc.)

```css
.btn-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 1.3em;
  cursor: pointer;
  transition: all 0.2s var(--ease-spring);
  flex-shrink: 0;
}

.btn-icon:active {
  transform: scale(0.9);
  background: var(--primary-muted);
  color: var(--primary);
}

.btn-icon--active {
  background: var(--primary-muted);
  color: var(--primary);
  border-color: rgba(245, 158, 11, 0.2);
}
```

---

### 5.2 Карточки объявлений

#### Карточка авто в списке

```
┌──────────────────────────────────────────┐
│ ┌─────────┐                              │
│ │         │  BMW X5 2020                 │
│ │  ФОТО   │  3.0 · Бензин · АКПП       │
│ │ 120×110 │  Грозный · 👁 234           │
│ │         │                              │
│ │         │  2 850 000 ₽                │
│ └─────────┘                   ☆          │
│                                          │
└──────────────────────────────────────────┘
  bg: #111827, border-bottom: rgba(255,255,255,0.04)
  active: bg shifts to #1A2332
```

```css
.ad-card {
  display: flex;
  gap: 12px;
  padding: 0;
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s var(--ease-out);
  position: relative;
}

.ad-card:active {
  background: var(--bg-elevated);
}

/* Фото */
.ad-card__photo {
  width: 120px;
  min-height: 110px;
  flex-shrink: 0;
  background: var(--bg-tertiary);
  position: relative;
  overflow: hidden;
}

.ad-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ad-card__photo .no-photo {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5em;
  opacity: 0.2;
}

/* Информация */
.ad-card__info {
  padding: 12px 14px 12px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.ad-card__title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ad-card__specs {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.ad-card__meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.ad-card__price {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--primary);
  margin-top: 4px;
}

/* Кнопка избранное в карточке */
.ad-card__fav {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 1em;
  cursor: pointer;
}

.ad-card__fav--active {
  color: var(--primary);
}
```

#### Карточка с расширенным видом (2 колонки, например на Home)

```
┌──────────────────┐  ┌──────────────────┐
│   ┌──────────┐   │  │   ┌──────────┐   │
│   │   ФОТО   │   │  │   │   ФОТО   │   │
│   │          │   │  │   │          │   │
│   └──────────┘   │  │   └──────────┘   │
│   BMW X5         │  │   Mercedes GLE   │
│   2 850 000 ₽    │  │   3 200 000 ₽    │
│   Грозный        │  │   Махачкала      │
└──────────────────┘  └──────────────────┘
```

```css
.ad-card-grid {
  background: var(--bg-secondary);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border);
  transition: transform 0.2s var(--ease-spring),
              box-shadow 0.2s var(--ease-out);
}

.ad-card-grid:active {
  transform: scale(0.98);
}

.ad-card-grid__photo {
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.ad-card-grid__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ad-card-grid__body {
  padding: 10px 12px 12px;
}

.ad-card-grid__title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ad-card-grid__price {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--primary);
  margin-top: 2px;
}

.ad-card-grid__meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}
```

#### Карточка номерного знака

```
┌──────────────────────────────────────────┐
│                                          │
│   ┌─────────────┐   500 000 ₽           │
│   │ А 777 АА 95 │   Регион: 95          │
│   └─────────────┘   Грозный · 👁 45     │
│                                          │
└──────────────────────────────────────────┘
```

```css
.plate-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s var(--ease-out);
}

.plate-card:active {
  background: var(--bg-elevated);
}

.plate-number {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 10px 16px;
  background: var(--bg-primary);
  border: 2px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}
```

---

### 5.3 Формы ввода

#### Text Input

```
  Марка автомобиля *
  ┌──────────────────────────────────┐
  │  BMW                             │  ← 48px height
  └──────────────────────────────────┘
      border: 1.5px solid rgba(255,255,255,0.08)
      focus: border-color amber, glow

  Ошибка:
  ┌──────────────────────────────────┐
  │                                  │  ← red border + glow
  └──────────────────────────────────┘
  ⚠ Обязательное поле
```

```css
/* Label */
.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-label.required::after {
  content: ' *';
  color: var(--error);
  font-weight: 700;
}

/* Input */
.form-input {
  width: 100%;
  padding: 13px 16px;
  min-height: 48px;
  font-size: 16px; /* !!! предотвращает zoom на iOS */
  font-family: inherit;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.form-input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

/* Focus */
.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
  background: rgba(31, 41, 55, 0.8);
}

/* Valid */
.form-input--valid {
  border-color: var(--success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Error */
.form-input--error {
  border-color: var(--error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Error message */
.form-error {
  font-size: 0.82rem;
  color: var(--error);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Select (custom arrow) */
.form-select {
  /* Наследует всё от .form-input плюс: */
  cursor: pointer;
  padding-right: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath fill='%239CA3AF' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
}

/* Textarea */
.form-textarea {
  /* Наследует всё от .form-input плюс: */
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}
```

**Tailwind эквивалент для input:**
```html
<input class="w-full py-3 px-4 min-h-[48px] text-base font-medium
  text-[#F9FAFB] bg-[#1F2937]
  border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl
  outline-none appearance-none
  placeholder:text-[#6B7280] placeholder:opacity-60
  focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]
  transition-all duration-200" />
```

#### Checkbox

```css
.form-checkbox-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.form-checkbox-row:active {
  border-color: var(--primary);
}

.form-checkbox-row input[type="checkbox"] {
  width: 22px;
  height: 22px;
  accent-color: var(--primary);
  border-radius: 6px;
  flex-shrink: 0;
}

.form-checkbox-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}
```

#### Number Plate Input (специальный)

```css
.plate-input {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
  background: var(--bg-primary) !important;
  border: 2px solid var(--border) !important;
}

.plate-input:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15) !important;
}
```

---

### 5.4 Заголовки страниц (Hero-секции)

Каждая страница начинается с hero-блока высотой 180–220px.

#### Структура Hero

```
┌──────────────────────────────────────────┐
│ ╲                                 ◉ glow │
│   ╲  gradient bg                        │
│                                          │
│        🚘                                │
│    Авто СКФО                             │
│    Авторынок Северного Кавказа           │
│                                   ◉ glow │
│ ─────────────────────────────────────── │
│ (rounded bottom corners into page)       │
└──────────────────────────────────────────┘
```

```css
.page-hero {
  position: relative;
  padding: 32px 20px 28px;
  padding-top: calc(32px + env(safe-area-inset-top, 0px));
  overflow: hidden;
  color: var(--text-primary);
}

.page-hero--home {
  padding: 40px 20px 36px;
  padding-top: calc(40px + env(safe-area-inset-top, 0px));
  text-align: center;
  background:
    radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245, 158, 11, 0.2) 0%, transparent 70%),
    linear-gradient(135deg, #111827 0%, #1A2332 40%, #1E3A5F 100%);
}

.page-hero--catalog {
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #0B0F19 0%, #1A2332 50%, #111827 100%);
}

.page-hero--sell {
  text-align: center;
  background:
    radial-gradient(ellipse 80% 60% at 80% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #0B1A12 0%, #112820 40%, #111827 100%);
}

.page-hero--profile {
  text-align: center;
  background:
    radial-gradient(ellipse 70% 50% at 50% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #111827 0%, #1A1A3E 40%, #111827 100%);
}

.page-hero--favorites {
  background:
    radial-gradient(ellipse 80% 50% at 60% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #111827 0%, #2A1520 40%, #111827 100%);
}

.page-hero--admin {
  background:
    radial-gradient(ellipse 80% 50% at 30% 0%, rgba(245, 158, 11, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #0B0F19 0%, #1F2937 50%, #111827 100%);
}

/* Hero icon (emoji) */
.page-hero__icon {
  font-size: 3rem;
  margin-bottom: 8px;
  display: block;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

/* Hero title */
.page-hero__title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  position: relative;
  z-index: 1;
}

/* Hero subtitle */
.page-hero__subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

/* Decorative glow orbs */
.page-hero__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
}

.page-hero__glow--1 {
  top: -40px;
  right: -30px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
  animation: glow-float 6s ease-in-out infinite;
}

.page-hero__glow--2 {
  bottom: -30px;
  left: -20px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
  animation: glow-float 8s ease-in-out infinite reverse;
}

@keyframes glow-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10px, -10px) scale(1.1); }
}
```

---

### 5.5 Навигация (Dock Bar)

```
┌──────────────────────────────────────────┐
│                                          │
│   🔍        ✚         ⭐       👤       │
│  Каталог  Продать  Избранное  Профиль   │
│           ─── active dot ───             │
│                                          │
└──────────────────────────────────────────┘
  Glass effect on dark bg
  Active: amber glow + scale icon
```

```css
.dock-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 12px 8px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  pointer-events: none;
}

.dock-bar__inner {
  display: flex;
  align-items: stretch;
  background: rgba(17, 24, 39, 0.85);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 -4px 32px rgba(0, 0, 0, 0.4),
    0 0 0 0.5px rgba(255, 255, 255, 0.05) inset;
  padding: 6px 8px;
  pointer-events: auto;
}

.dock-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 0;
  min-height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  position: relative;
  color: var(--text-muted);
  border-radius: 16px;
  transition: color 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.dock-tab:active {
  background: rgba(245, 158, 11, 0.1);
}

.dock-tab--active {
  color: var(--primary);
  background: rgba(245, 158, 11, 0.1);
}

.dock-tab__icon {
  font-size: 1.5em;
  line-height: 1;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dock-tab--active .dock-tab__icon {
  transform: scale(1.15) translateY(-1px);
}

.dock-tab__label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Active indicator dot */
.dock-tab__dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}
```

---

### 5.6 Бейджи статусов

```
  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐
  │ ✅ Активно│  │ ⏳ На модерации│  │ ❌ Отклонено│  │ 🟣 Продано│
  └──────────┘  └──────────────┘  └───────────┘  └─────────┘
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 8px;
  white-space: nowrap;
}

.badge--approved {
  background: var(--success-muted);
  color: var(--success);
}

.badge--pending {
  background: var(--warning-muted);
  color: var(--warning);
}

.badge--rejected {
  background: var(--error-muted);
  color: var(--error);
}

.badge--sold {
  background: var(--sold-muted);
  color: var(--sold);
}

/* Category badges (for admin) */
.badge--car {
  background: rgba(59, 130, 246, 0.85);
  color: #fff;
  backdrop-filter: blur(8px);
}

.badge--plate {
  background: rgba(245, 158, 11, 0.85);
  color: #0B0F19;
  backdrop-filter: blur(8px);
}
```

---

### 5.7 Панель фильтров

```
  ┌──────────────────────────────────────────┐
  │  ┌───────────┐  ┌───────────┐  ┌──────┐ │
  │  │ Город ▾   │  │ Сортировка▾│  │ 🔄   │ │
  │  └───────────┘  └───────────┘  └──────┘ │
  └──────────────────────────────────────────┘
    sticky top, glass bg
```

```css
.filters-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(11, 15, 25, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-light);
}

.filter-chip {
  flex: 1;
  min-width: 0;
  padding: 10px 36px 10px 14px;
  min-height: 44px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.88rem;
  font-weight: 500;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath fill='%239CA3AF' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.filter-chip:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.filter-chip--active {
  border-color: var(--primary);
  background: var(--primary-muted);
  color: var(--primary);
}

/* Reset filter button */
.filter-reset {
  width: 44px;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.filter-reset:active {
  background: var(--error-muted);
  color: var(--error);
  border-color: rgba(239, 68, 68, 0.2);
}
```

---

### 5.8 Галерея фото

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│              PHOTO 4:3                   │
│                                          │
│                                          │
│  ◀  ────────  ● ○ ○ ○  ────────  ▶     │
│           2 / 8                          │
└──────────────────────────────────────────┘
  bg: #0B0F19
  buttons: glass pills
  dots: amber active
```

```css
.gallery {
  position: relative;
  background: var(--bg-primary);
  overflow: hidden;
}

.gallery__img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}

.gallery__placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  opacity: 0.3;
}

/* Navigation overlay */
.gallery__nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.gallery__btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery__btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.25);
}

.gallery__btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.gallery__counter {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

/* Dots */
.gallery__dots {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
}

.gallery__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.gallery__dot--active {
  background: var(--primary);
  width: 20px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}
```

---

### 5.9 Пустые состояния

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│              💔                           │
│       (floating animation)               │
│                                          │
│       Нет избранных                      │
│                                          │
│   Нажмите ☆ чтобы сохранить            │
│                                          │
│   ┌────────────────────────┐             │
│   │   Перейти в каталог    │             │
│   └────────────────────────┘             │
│                                          │
└──────────────────────────────────────────┘
  Subtle bg glow behind emoji
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 50vh;
  padding: 32px 24px;
  gap: 8px;
}

.empty-state__icon {
  font-size: 4rem;
  margin-bottom: 8px;
  position: relative;
}

/* Glow behind icon */
.empty-state__icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(20px);
  z-index: -1;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state__desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  max-width: 280px;
  line-height: 1.5;
}

.empty-state__action {
  margin-top: 16px;
}
```

---

### 5.10 Form Section (группировка полей)

```css
.form-section {
  background: var(--bg-secondary);
  border-radius: 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  padding: 0 16px 16px;
  margin-bottom: 8px;
}

.form-section:first-of-type {
  border-radius: 18px 18px 0 0;
  margin: 0 8px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.form-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 12px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-section__icon {
  font-size: 1.1em;
}

.form-group {
  margin-bottom: 14px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
```

---

### 5.11 Карточки статистики (Profile/Admin)

```css
.stat-card {
  background: var(--bg-secondary);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  border: 1px solid var(--border);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.stat-card:active {
  transform: scale(0.97);
}

.stat-card__value {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
}

.stat-card__value--success { color: var(--success); }
.stat-card__value--warning { color: var(--warning); }
.stat-card__value--error { color: var(--error); }

.stat-card__label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

---

### 5.12 Блок ошибок формы

```css
.form-errors {
  margin: 0 12px 16px;
  padding: 14px 16px;
  background: var(--error-muted);
  border: 1.5px solid rgba(239, 68, 68, 0.3);
  border-radius: 14px;
  animation: shake 0.4s ease-out;
}

.form-errors__title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--error);
  margin-bottom: 6px;
}

.form-errors__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-errors__list li {
  font-size: 0.88rem;
  color: var(--text-primary);
  padding-left: 16px;
  position: relative;
  line-height: 1.4;
}

.form-errors__list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--error);
  font-weight: 700;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
```

---

### 5.13 Detour: Spec Row (Detail Page)

```css
.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-light);
}

.spec-row:last-child {
  border-bottom: none;
}

.spec-row__label {
  font-size: 0.92rem;
  color: var(--text-muted);
}

.spec-row__value {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}
```

---

### 5.14 Контакты / CTA Footer

```css
.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgba(17, 24, 39, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  z-index: 50;
  max-width: 480px;
  margin: 0 auto;
}
```

---

### 5.15 Submit Section (Fixed Bottom)

```css
.submit-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--bg-primary) 70%, transparent);
  z-index: 50;
}

.submit-section .btn {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}
```

---

## 6. Страницы

### 6.1 Home (Главная)

```
┌──────────────────────────────────────────┐
│ safe-area-inset-top                      │
├──────────────────────────────────────────┤
│                                          │
│  ◉ amber glow                            │
│                                          │
│              🚘                           │
│          Авто СКФО                       │
│   Авторынок Северного Кавказа            │
│                                          │
│                            ◉ blue glow   │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📋  Каталог                    › │    │
│  │     Авто и номера СКФО          │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────┐  ┌──────────────┐      │
│  │     🚗       │  │     🔢       │      │
│  │  Продать     │  │  Продать     │      │
│  │  авто        │  │  номер       │      │
│  └──────────────┘  └──────────────┘      │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📋  Мои объявления             › │    │
│  │     Управление вашими           │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ⭐  Избранное                  › │    │
│  │     Сохранённые объявления      │    │
│  └──────────────────────────────────┘    │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  🔍 Каталог │ ✚ Продать │ ⭐ │ 👤       │
│             ●                            │
└──────────────────────────────────────────┘
```

**Ключевые детали:**
- Hero с `page-hero--home` фоном
- Карточки навигации с иконками на цветном фоне
- Grid 2 колонки для "Продать авто" / "Продать номер"
- Каждая карточка: `bg-secondary`, border, radius-14, active-scale(0.97)

---

### 6.2 Каталог

```
┌──────────────────────────────────────────┐
│                                          │
│  🔍 Каталог                              │
│     Авто и номера СКФО                   │
│                                          │
│  ┌──────────────┬──────────────┐         │
│  │  🚗 Авто    │  🔢 Номера   │          │
│  │  (active)    │              │          │
│  └──────────────┴──────────────┘         │
│                                          │
├──────────────────────────────────────────┤
│  ┌─────────────┐ ┌──────────────┐ ┌──┐  │
│  │ Все города ▾│ │ Сначала нов ▾│ │🔄│  │
│  └─────────────┘ └──────────────┘ └──┘  │  ← sticky filters
├──────────────────────────────────────────┤
│  23 объявления                           │
│                                          │
│  ┌─────────┬───────────────────────┐    │
│  │         │ BMW X5 2020           │    │
│  │  ФОТО   │ 3.0 · Бензин · АКПП  │    │
│  │         │ Грозный · 👁 234      │    │
│  │         │ 2 850 000 ₽           │    │
│  └─────────┴───────────────────────┘    │
│  ┌─────────┬───────────────────────┐    │
│  │         │ Mercedes GLE 2021     │    │
│  │  ФОТО   │ ...                   │    │
│  │         │                       │    │
│  └─────────┴───────────────────────┘    │
│  ...                                    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │       Показать ещё (10)         │    │
│  └──────────────────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  🔍 Каталог │ ✚ Продать │ ⭐ │ 👤       │
└──────────────────────────────────────────┘
```

**Ключевые детали:**
- Hero с tab-switcher (Авто / Номера) — glass pill style
- Active tab: bg-secondary, text-primary, shadow
- Inactive tab: transparent, text-muted
- Фильтры: sticky, glass background
- Карточки: без gap, разделены border-light
- Кнопка "Показать ещё": btn-secondary

---

### 6.3 Детали объявления

```
┌──────────────────────────────────────────┐
│                                          │
│              GALLERY (4:3)               │
│                                          │
│  ◀   ● ○ ○ ○ ○    2/8      ▶           │
│                                          │
├──────────────────────────────────────────┤
│  ← Назад                                │
│                                          │
│  BMW X5 xDrive30d 2020                   │
│  2 850 000 ₽     (gradient text)         │
│                                          │
│  ┌──────────────┬──────────────────┐    │
│  │ ✅ Активно    │  📍 Грозный     │    │
│  └──────────────┴──────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  ХАРАКТЕРИСТИКИ                          │
│  ─────────────────────────────────       │
│  Год                          2020       │
│  ─────────────────────────────────       │
│  Двигатель              3.0 Дизель       │
│  ─────────────────────────────────       │
│  КПП                         АКПП        │
│  ─────────────────────────────────       │
│  Пробег                120 000 км        │
│  ─────────────────────────────────       │
│  Цвет                     Чёрный         │
│  ─────────────────────────────────       │
│  Регион                        95        │
├──────────────────────────────────────────┤
│  ОПИСАНИЕ                                │
│                                          │
│  Автомобиль в отличном состоянии...      │
│                                          │
├──────────────────────────────────────────┤
│  Опубликовано 03.02.2026                 │
├──────────────────────────────────────────┤
│ ┌────────────┐ ┌───────────┐ ┌────────┐ │
│ │ 📞 Позвонить│ │💬 Написать│ │ ☆ Fav  │ │  ← fixed bottom
│ └────────────┘ └───────────┘ └────────┘ │
└──────────────────────────────────────────┘
```

**Ключевые детали:**
- Галерея фото: swipe gestures, dots, counter
- Цена: gradient text (amber)
- Характеристики: alternating row style
- Fixed footer с кнопками действий
- Кнопка "Назад": text link, amber color

---

### 6.4 Создание объявления (форма)

```
┌──────────────────────────────────────────┐
│                                          │
│  ← Назад                                │
│  🚗 Продать автомобиль                   │
│  Заполните данные                         │
│                                          │
├──────────────────────────────────────────┤
│  📷 ФОТОГРАФИИ                           │
│  ┌─────┐ ┌─────┐ ┌─────┐                │
│  │  +  │ │ img │ │ img │                │
│  │ add │ │  ×  │ │  ×  │                │
│  └─────┘ └─────┘ └─────┘                │
├──────────────────────────────────────────┤
│  🚘 ОСНОВНОЕ                             │
│                                          │
│  Марка *                                 │
│  ┌────────────────────────────────┐      │
│  │ BMW                           ▾│      │
│  └────────────────────────────────┘      │
│                                          │
│  Модель *                                │
│  ┌────────────────────────────────┐      │
│  │ X5                             │      │
│  └────────────────────────────────┘      │
│                                          │
│  Год *             Пробег (км) *        │
│  ┌──────────┐     ┌──────────────┐      │
│  │ 2020     │     │ 120000       │      │
│  └──────────┘     └──────────────┘      │
├──────────────────────────────────────────┤
│  ⚙️ ТЕХНИЧЕСКИЕ                          │
│                                          │
│  Двигатель *       КПП *                │
│  ┌──────────┐     ┌──────────────┐      │
│  │ Бензин ▾ │     │ АКПП       ▾│      │
│  └──────────┘     └──────────────┘      │
│                                          │
│  Объём (л)         Цвет                  │
│  ┌──────────┐     ┌──────────────┐      │
│  │ 3.0      │     │ Чёрный     ▾│      │
│  └──────────┘     └──────────────┘      │
├──────────────────────────────────────────┤
│  💰 ЦЕНА И КОНТАКТЫ                     │
│                                          │
│  Цена (₽) *                             │
│  ┌────────────────────────────────┐      │
│  │ 2850000                        │      │
│  └────────────────────────────────┘      │
│                                          │
│  Описание                                │
│  ┌────────────────────────────────┐      │
│  │                                │      │
│  │ Расскажите подробнее...        │      │
│  │                                │      │
│  └────────────────────────────────┘      │
│                                          │
│  ☑ Торг уместен                         │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐    │
│  │  🚗  Опубликовать на модерацию   │    │  ← fixed, gradient btn
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

### 6.5 Профиль

```
┌──────────────────────────────────────────┐
│                                          │
│  ◉ purple glow                           │
│                                          │
│        ┌───┐                             │
│        │ А │  avatar                     │
│        └───┘                             │
│     Астемир                              │
│     @username                            │
│     На платформе с янв 2025              │
│                                          │
├──────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐      │
│  │    3     │    1     │    0     │      │
│  │ Активных │На модер. │Отклонено │  ← overlay card
│  └──────────┴──────────┴──────────┘      │
│                                          │
│  МОИ ОБЪЯВЛЕНИЯ                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │  3   │ │  1   │ │  0   │ │  4   │    │
│  │🟢 Акт│ │🟡 Мод│ │🔴 Отк│ │📊 Все│    │
│  └──────┘ └──────┘ └──────┘ └──────┘    │
│                                          │
│    🚗 Авто: 3        🔢 Номера: 1       │
│                                          │
│  БЫСТРЫЕ ДЕЙСТВИЯ                        │
│  ┌──────────────────────────────────┐    │
│  │ 📋  Мои объявления          (4) │    │
│  ├──────────────────────────────────┤    │
│  │ ⭐  Избранное                    │    │
│  └──────────────────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  🔍 Каталог │ ✚ Продать │ ⭐ │ 👤       │
└──────────────────────────────────────────┘
```

---

### 6.6 Мои объявления

```
┌──────────────────────────────────────────┐
│  ← Назад                                │
│                                          │
│  📋 Мои объявления                       │
│  4 объявления                            │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────┬───────────────────────┐    │
│  │  badge  │ BMW X5 2020           │    │
│  │ ✅      │ 2 850 000 ₽           │    │
│  │  ФОТО   │ Грозный               │    │
│  │         │                       │    │
│  │         │  [✏️ Редакт.] [🗑]     │    │
│  └─────────┴───────────────────────┘    │
│                                          │
│  ... more cards ...                      │
│                                          │
└──────────────────────────────────────────┘
```

---

### 6.7 Избранное

```
┌──────────────────────────────────────────┐
│                                          │
│  ⭐ Избранное                            │
│  Ваши сохранённые                        │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────┬───────────────────────┐    │
│  │         │ BMW X5 2020           │    │
│  │  ФОТО   │ Грозный · 👁 234      │    │
│  │         │ 2 850 000 ₽           │    │
│  └─────────┴───────────────────────┘    │
│                                          │
│  ... or empty state:                     │
│                                          │
│              💔                           │
│       Нет избранных                      │
│   Нажмите ☆ чтобы сохранить            │
│                                          │
├──────────────────────────────────────────┤
│  🔍 Каталог │ ✚ Продать │ ⭐ │ 👤       │
└──────────────────────────────────────────┘
```

---

### 6.8 Админ-панель

```
┌──────────────────────────────────────────┐
│                                          │
│  ◉ subtle amber glow                    │
│                                          │
│  🛡️ Админ-панель                         │
│                                          │
│  ┌──────────┐ ┌──────────┐              │
│  │    5     │ │    12    │              │
│  │ ⏳ Ожид.  │ │ ✅ Одобр. │              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │    2     │ │    19    │              │
│  │ ❌ Откл.  │ │ 📊 Всего  │              │
│  └──────────┘ └──────────┘              │
│                                          │
│  НА МОДЕРАЦИИ                            │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐    │
│  │ 🚗 badge                         │    │
│  │ ┌───────────────────────────┐    │    │
│  │ │        PHOTO 16:9         │    │    │
│  │ └───────────────────────────┘    │    │
│  │ BMW X5 2020                      │    │
│  │ 2 850 000 ₽                      │    │
│  │ Грозный · @user · 03.02.26      │    │
│  │                                  │    │
│  │ ┌───────────┐ ┌───────────┐     │    │
│  │ │ ✅ Одобрить│ │ ❌ Отклонить│     │    │
│  │ └───────────┘ └───────────┘     │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

---

## 7. Анимации

### 7.1 Page Transitions (Framer Motion)

```tsx
// В App.tsx — уже используем, оптимизируем
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
}
```

### 7.2 Card Stagger (появление карточек)

```tsx
// Для списков объявлений
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
}

// Использование
<motion.div
  custom={index}
  variants={cardVariants}
  initial="hidden"
  animate="visible"
>
```

### 7.3 Button Press

```css
/* CSS — работает быстрее чем Framer для простых состояний */
.btn-primary:active {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}

/* Для haptic feedback на Telegram */
```

```tsx
// JS — haptic + visual
const handleButtonPress = () => {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
}
```

### 7.4 Filter Panel Toggle

```tsx
const filterVariants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
}
```

### 7.5 Success State

```tsx
const successVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
}

// Checkmark animation
const checkVariants = {
  hidden: { pathLength: 0 },
  visible: {
    pathLength: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.2 },
  },
}
```

### 7.6 Error Shake

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.form-errors {
  animation: shake 0.4s ease-out;
}
```

### 7.7 Skeleton Loading

Заменяем текстовый "Загрузка..." на скелетоны.

```css
.skeleton {
  background: var(--bg-tertiary);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.04) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Skeleton components */
.skeleton-card {
  display: flex;
  gap: 12px;
  padding: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.skeleton-photo {
  width: 120px;
  height: 110px;
  flex-shrink: 0;
}

.skeleton-text {
  height: 14px;
  margin-bottom: 8px;
}

.skeleton-text--short { width: 60%; }
.skeleton-text--medium { width: 80%; }
.skeleton-text--long { width: 95%; }
.skeleton-text--price { width: 40%; height: 18px; }
```

```tsx
// React component
function AdCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-photo" />
      <div style={{ padding: '12px 14px 12px 0', flex: 1 }}>
        <div className="skeleton skeleton-text skeleton-text--medium" />
        <div className="skeleton skeleton-text skeleton-text--short" />
        <div className="skeleton skeleton-text skeleton-text--short" />
        <div className="skeleton skeleton-text skeleton-text--price" style={{ marginTop: 8 }} />
      </div>
    </div>
  )
}

function AdListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

### 7.8 Floating Emoji (пустые состояния)

```tsx
const floatAnimation = {
  y: [0, -12, 0],
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

// <motion.span animate={floatAnimation}>💔</motion.span>
```

### 7.9 Glow Pulse (hero backgrounds)

```css
@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.6;
    transform: translate(0, 0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(5px, -5px) scale(1.05);
  }
}

@keyframes glow-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(15px, -10px) scale(1.05);
  }
  66% {
    transform: translate(-8px, 8px) scale(0.97);
  }
}
```

### 7.10 Hero shimmer (кнопка подачи)

```css
@keyframes shimmer {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.btn-primary::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: shimmer 3s ease-in-out infinite;
}
```

---

## 8. Специфика Telegram Mini App

### 8.1 Viewport & Safe Areas

```css
/* Обработка safe-area для всех устройств */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

/* Hero учитывает notch */
.page-hero {
  padding-top: calc(32px + var(--sat));
}

/* Fixed bottom bars учитывают home indicator */
.dock-bar {
  padding-bottom: max(10px, var(--sab));
}

.detail-footer,
.submit-section {
  padding-bottom: max(12px, var(--sab));
}
```

### 8.2 Touch Targets

```css
/* Apple HIG минимум: 44×44px */
button,
a,
select,
[role="button"],
.ad-card,
.dock-tab {
  min-height: 44px;
}

input,
textarea,
select {
  min-height: 48px;
  font-size: 16px; /* ОБЯЗАТЕЛЬНО: предотвращает auto-zoom на iOS */
}
```

### 8.3 Перформанс

```
⚠️ ПРАВИЛА ПРОИЗВОДИТЕЛЬНОСТИ:

1. Анимации: используем ТОЛЬКО transform и opacity
   - НЕ анимируем width, height, padding, margin, top/left
   - will-change: transform — только на анимируемых элементах

2. Backdrop-filter: используем ТОЛЬКО для:
   - Dock bar (1 элемент)
   - Gallery navigation (1 элемент)
   - Filters bar (1 элемент)
   - НЕ используем на карточках в списке (много DOM-нод)

3. Box-shadow: статические, не анимируем
   - Анимируем opacity родителя вместо shadow transition

4. Framer Motion:
   - useReducedMotion() хук — уважаем системные настройки
   - Стаггер карточек: max 8 элементов, остальные без delay
   - AnimatePresence mode="wait" (не "sync")

5. Images:
   - loading="lazy" на всех фото в списках
   - aspect-ratio: 4/3 для предотвращения layout shift
   - object-fit: cover, фиксированные размеры контейнера

6. Scrolling:
   - -webkit-overflow-scrolling: touch (для старых WebKit)
   - overscroll-behavior: contain (предотвращает pull-to-refresh конфликт)
```

```tsx
// Хук для reduced motion
import { useReducedMotion } from 'framer-motion'

function AdCard({ index }: { index: number }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : {
        delay: Math.min(index * 0.06, 0.48), // max 0.48s delay
        duration: 0.35,
      }}
    >
      {/* ... */}
    </motion.div>
  )
}
```

### 8.4 Шрифты

```css
/*
  Используем system font stack.
  На iOS = SF Pro (идеально для авто-темы).
  На Android = Roboto.

  НЕ подключаем Google Fonts через <link> — в WebView
  часто блокируется или грузится медленно.

  Если нужен кастомный шрифт — инлайнить через base64 @font-face
  (не рекомендуется для >100KB файлов).
*/

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Display',
    'SF Pro Text',
    system-ui,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    sans-serif;
}
```

### 8.5 Принудительное игнорирование Telegram темы

```css
/*
  КРИТИЧЕСКИ ВАЖНО:
  Все цвета — хардкод, НЕ var(--tg-theme-*).
  Telegram может выдать белый/голубой/розовый фон —
  мы это игнорируем.
*/

html, body {
  background: #0B0F19 !important;
  color: #F9FAFB !important;
  color-scheme: dark !important;
}

/* Если Telegram пытается применить свой фон к WebView */
.app {
  background: #0B0F19;
  color: #F9FAFB;
  isolation: isolate; /* создаём новый stacking context */
}
```

### 8.6 Telegram WebApp API Integration

```tsx
// Инициализация — отключаем стандартную тему Telegram
useEffect(() => {
  const tg = window.Telegram?.WebApp
  if (tg) {
    tg.ready()
    tg.expand() // раскрываем на полный экран
    tg.setHeaderColor('#0B0F19')    // цвет хедера Telegram
    tg.setBackgroundColor('#0B0F19') // цвет фона Telegram

    // Haptic feedback при навигации
    tg.HapticFeedback?.impactOccurred('light')
  }
}, [])
```

---

## 9. Имплементация

### 9.1 Полная замена CSS Custom Properties

Заменяем ВСЕ `var(--tg-theme-*)` на фиксированные значения:

| Было (старое) | Стало (новое) |
|---|---|
| `var(--tg-theme-bg-color, #f0f2f5)` | `var(--bg-primary)` → `#0B0F19` |
| `var(--tg-theme-text-color, #1a1a2e)` | `var(--text-primary)` → `#F9FAFB` |
| `var(--tg-theme-hint-color, #6b7280)` | `var(--text-muted)` → `#6B7280` |
| `var(--tg-theme-link-color, #6366f1)` | `var(--secondary)` → `#3B82F6` |
| `var(--tg-theme-button-color, #6366f1)` | `var(--primary)` → `#F59E0B` |
| `var(--tg-theme-button-text-color, #fff)` | `#0B0F19` (тёмный текст на золоте) |
| `var(--tg-theme-secondary-bg-color, #e8eaed)` | `var(--bg-tertiary)` → `#1F2937` |
| `var(--tg-theme-section-bg-color, #ffffff)` | `var(--bg-secondary)` → `#111827` |

### 9.2 Чеклист миграции

```markdown
## Миграция на Design System v2

### Phase 1: Tokens (1-2 часа)
- [ ] Заменить все :root переменные на новые
- [ ] Удалить все var(--tg-theme-*) из CSS
- [ ] Добавить body { background: #0B0F19; color: #F9FAFB; }
- [ ] Добавить Telegram header/bg color в useEffect

### Phase 2: Backgrounds (2-3 часа)
- [ ] Заменить все hero-градиенты на новые (dark тема)
- [ ] Добавить glow-orb декорации на hero-блоки
- [ ] Добавить radial-gradient на body background
- [ ] Обновить dock-bar на тёмный glass

### Phase 3: Components (3-4 часа)
- [ ] Кнопки: новые стили (gold primary, dark secondary)
- [ ] Карточки: тёмный фон, светлый текст, amber цена
- [ ] Формы: тёмные поля, amber focus, error shake
- [ ] Бейджи: обновить цвета на muted variants
- [ ] Фильтры: тёмный glass

### Phase 4: Typography (1 час)
- [ ] Добавить text utility классы
- [ ] Проверить все font-weight
- [ ] Убедиться в 16px на всех inputs

### Phase 5: Animations (2-3 часа)
- [ ] Skeleton loaders вместо "Загрузка..."
- [ ] Shimmer на primary кнопках
- [ ] Glow pulse на hero
- [ ] Error shake animation
- [ ] Stagger cards (ограничить до 8)

### Phase 6: Polish (1-2 часа)
- [ ] Safe area проверка на iPhone SE / 15 Pro Max
- [ ] Reduced motion поддержка
- [ ] Проверить перформанс (60fps scroll)
- [ ] Тест в реальном Telegram WebView
```

### 9.3 Итоговая структура CSS файла

```css
/* App.css — порядок секций */

/* 1. Imports */
@import "tailwindcss/utilities" layer(utilities);

/* 2. Design Tokens (:root) */
:root { /* все custom properties */ }

/* 3. Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; }
body { background: #0B0F19; color: #F9FAFB; }

/* 4. Touch & Accessibility */
button, a, select { min-height: 44px; }
input, textarea { min-height: 48px; font-size: 16px; }

/* 5. Layout */
.app { /* container */ }

/* 6. Hero Sections */
.page-hero { }
.page-hero--home { }
.page-hero--catalog { }
/* ... */

/* 7. Navigation */
.dock-bar { }

/* 8. Cards */
.ad-card { }
.plate-card { }

/* 9. Forms */
.form-input { }
.form-select { }
.form-section { }

/* 10. Buttons */
.btn-primary { }
.btn-secondary { }
.btn-danger { }
.btn-ghost { }

/* 11. Badges */
.badge { }

/* 12. Gallery */
.gallery { }

/* 13. Utility */
.skeleton { }
.empty-state { }

/* 14. Animations (keyframes at bottom) */
@keyframes shimmer { }
@keyframes shake { }
@keyframes glow-float { }
@keyframes skeleton-shimmer { }
```

---

## Приложение A: Визуальное сравнение

```
  БЫЛО (светлая тема)          СТАЛО (Caucasus Premium Dark)
  ┌──────────────┐             ┌──────────────┐
  │ ░░░░░░░░░░░░ │ bg: #f0f2f5 │ ████████████ │ bg: #0B0F19
  │ ╔══════════╗ │             │ ╔══════════╗ │
  │ ║ 🔮 Purple ║ │ accent      │ ║ 🥇 Gold   ║ │ accent
  │ ║ gradient  ║ │ #6366f1     │ ║ gradient  ║ │ #F59E0B
  │ ╚══════════╝ │             │ ╚══════════╝ │
  │ ┌──────────┐ │             │ ┌──────────┐ │
  │ │ white bg │ │ card #fff   │ │ dark bg  │ │ card #111827
  │ │ dark text│ │ text #1a1a  │ │ light txt│ │ text #F9FAFB
  │ │ 2.8M ₽   │ │ price purple│ │ 2.8M ₽   │ │ price amber
  │ └──────────┘ │             │ └──────────┘ │
  │              │             │              │
  │ [  Submit  ] │ purple btn  │ [  Submit  ] │ gold gradient btn
  └──────────────┘             └──────────────┘
```

---

## Приложение B: Accessibility

- **Contrast ratios (WCAG AA):**
  - Text primary (#F9FAFB) on bg-primary (#0B0F19): **18.7:1** ✅
  - Text secondary (#9CA3AF) on bg-primary (#0B0F19): **7.4:1** ✅
  - Text muted (#6B7280) on bg-primary (#0B0F19): **4.7:1** ✅ (AA for large text)
  - Primary (#F59E0B) on bg-primary (#0B0F19): **8.5:1** ✅
  - Text inverted (#0B0F19) on primary (#F59E0B): **8.5:1** ✅

- **Touch targets:** Minimum 44×44px everywhere
- **Font sizes:** Minimum 12px (small badges), 16px for inputs
- **Reduced motion:** Respected via `useReducedMotion()`
- **Focus indicators:** Visible amber ring on all interactive elements

---

## Приложение C: Color Usage Quick Reference

```
┌────────────────────────────────────────────────────────┐
│ ELEMENT              │ BACKGROUND    │ TEXT/ICON       │
├──────────────────────┼───────────────┼─────────────────┤
│ Page background      │ #0B0F19       │ —               │
│ Card / Panel         │ #111827       │ #F9FAFB         │
│ Input field          │ #1F2937       │ #F9FAFB         │
│ Placeholder          │ —             │ #6B7280 @ 60%   │
│ Primary button       │ gold gradient │ #0B0F19         │
│ Secondary button     │ #1F2937       │ #F9FAFB         │
│ Danger button        │ error-muted   │ #EF4444         │
│ Link                 │ —             │ #3B82F6         │
│ Price                │ —             │ #F59E0B         │
│ Dock bar             │ #111827 @ 85% │ —               │
│ Dock tab (inactive)  │ —             │ #6B7280         │
│ Dock tab (active)    │ primary-muted │ #F59E0B         │
│ Badge approved       │ success-muted │ #10B981         │
│ Badge pending        │ warning-muted │ #F59E0B         │
│ Badge rejected       │ error-muted   │ #EF4444         │
│ Badge sold           │ sold-muted    │ #8B5CF6         │
│ Skeleton             │ #1F2937       │ —               │
│ Border (general)     │ —             │ rgba(255,255,255,0.08) │
│ Hero glow orb        │ primary @ 20% │ —               │
│ Focus ring           │ primary @ 15% │ —               │
└──────────────────────┴───────────────┴─────────────────┘
```

---

**Конец документа.**

> Этот design system — полная спецификация для разработчика. Все цвета, размеры, анимации и компоненты описаны с точными значениями. Следуй чеклисту миграции в разделе 9.2 для поэтапного внедрения.
