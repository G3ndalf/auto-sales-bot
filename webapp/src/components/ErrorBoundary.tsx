/**
 * ErrorBoundary.tsx — Глобальный перехватчик ошибок React.
 *
 * React 18 в production молча глотает ошибки рендера — экран становится
 * пустым/чёрным без каких-либо сообщений в консоли.
 *
 * Этот компонент:
 * 1. Ловит ВСЕ ошибки рендера дочерних компонентов
 * 2. Показывает понятное сообщение об ошибке на экране
 * 3. Предлагает кнопку "Обновить" для восстановления
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Логируем в консоль (на случай если есть доступ к remote debug)
    console.error('[ErrorBoundary] Caught:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px 16px',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          color: '#333',
          fontFamily: '-apple-system, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Что-то пошло не так
          </h1>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', maxWidth: '300px' }}>
            Произошла ошибка при загрузке страницы. Попробуйте обновить.
          </p>

          {/* Показываем техническую информацию (для отладки) */}
          <details style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #ddd',
            width: '100%',
            maxWidth: '360px',
            textAlign: 'left',
          }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#888' }}>
              Техническая информация
            </summary>
            <pre style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#c00',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '200px',
              overflow: 'auto',
            }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>

          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 Обновить страницу
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
