// Конфигурационные константы Mini App

export const CONFIG = {
  MAX_CAR_PHOTOS: 10,
  MAX_PLATE_PHOTOS: 5,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_YEAR: 1980,
  MAX_YEAR: new Date().getFullYear() + 1,
  MAX_PRICE: 999_999_999,
} as const;
