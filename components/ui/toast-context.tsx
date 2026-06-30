import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'

type ToastVariant = 'default' | 'destructive' | 'success'

type ToastItem = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastContextType = {
  toast: (opts: Omit<ToastItem, 'id'>) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

export function ToastContextProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...opts, id }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(({ id, title, description, variant }) => (
          <View
            key={id}
            style={[
              styles.toast,
              variant === 'destructive' && styles.destructive,
              variant === 'success' && styles.success,
            ]}
          >
            {title && <Text style={styles.title}>{title}</Text>}
            {description && <Text style={styles.description}>{description}</Text>}
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastContextProvider')
  return ctx
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destructive: { backgroundColor: '#dc2626' },
  success: { backgroundColor: '#16a34a' },
  title: { color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'right' },
  description: { color: '#d1d5db', fontSize: 13, marginTop: 2, textAlign: 'right' },
})
