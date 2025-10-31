declare module 'react-email-editor' {
  import { Component } from 'react'

  export interface Design {
    body?: Record<string, unknown>
    [key: string]: unknown
  }

  export interface EditorRef {
    editor: {
      exportHtml: (callback: (data: { design: Design; html: string }) => void) => void
      loadDesign: (design: Design) => void
      saveDesign: (callback: (design: Design) => void) => void
    }
  }

  export interface EmailEditorProps {
    ref?: React.Ref<EditorRef>
    onReady?: () => void
    onLoad?: () => void
    minHeight?: string | number
    style?: React.CSSProperties
    tools?: Record<string, unknown>
    appearance?: Record<string, unknown>
    projectId?: number
    locale?: string
    options?: Record<string, unknown>
  }

  export default class EmailEditor extends Component<EmailEditorProps> {}
}
