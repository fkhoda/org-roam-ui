import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** shown instead of the children after they threw */
  fallback: ReactNode
  /** a new value clears the error: e.g. the note being shown */
  resetKey?: unknown
}

/** Contain a render error to this part of the page instead of blanking all of it. */
export class ErrorBoundary extends Component<Props, { error: unknown; resetKey: unknown }> {
  state = { error: null as unknown, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: { error: unknown; resetKey: unknown }) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    return this.state.error ? this.props.fallback : this.props.children
  }
}
