// components/ui/select.tsx - Composant Select réutilisable (composé)
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('useSelectContext must be used within a Select component')
  }
  return context
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div ref={ref} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = useSelectContext()

  return (
    <button
      ref={ref}
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')} />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ placeholder = 'Sélectionner...', ...props }, ref) => {
  const { value } = useSelectContext()
  
  return (
    <span ref={ref} {...props}>
      {value || placeholder}
    </span>
  )
})
SelectValue.displayName = 'SelectValue'

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen } = useSelectContext()

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-full mt-2 max-h-96 min-w-[8rem] overflow-y-auto rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setIsOpen } = useSelectContext()

    const handleClick = () => {
      onValueChange(value)
      setIsOpen(false)
    }

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={cn(
          'px-3 py-2 cursor-pointer hover:bg-blue-100 transition-colors',
          selectedValue === value && 'bg-blue-50 font-medium text-blue-900',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}