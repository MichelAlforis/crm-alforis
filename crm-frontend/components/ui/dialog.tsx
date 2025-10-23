import * as React from "react"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open: controlledOpen, onOpenChange, children }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <DialogContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild = false, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  if (!context) throw new Error("DialogTrigger must be used within Dialog")

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e: any) => {
        props.onClick?.(e)
        children.props.onClick?.(e)
        context.onOpenChange(true)
      },
    } as any)
  }

  return (
    <button
      ref={ref}
      {...props}
      onClick={(e) => {
        props.onClick?.(e)
        context.onOpenChange(true)
      }}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogContent must be used within Dialog")

    if (!context.open) return null

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => context.onOpenChange(false)}
        />
        <div className="fixed left-0 top-0 right-0 bottom-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div
            ref={ref}
            className={`w-full h-full max-w-lg sm:max-h-[90vh] flex flex-col border bg-background shadow-lg duration-200 sm:rounded-lg overflow-hidden ${className}`}
            {...props}
          >
            {children}
          </div>
        </div>
      </>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
