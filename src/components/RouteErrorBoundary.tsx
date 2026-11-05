import { Component, type ReactNode } from 'react'
import { Button, Header, Screen } from './Layout.tsx'

type RouteErrorBoundaryProps = { readonly children: ReactNode }
type RouteErrorBoundaryState = { readonly failed: boolean }

/** A route failure leaves the app providers mounted until the user chooses to reload. */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <Screen header={<Header title="화면을 불러올 수 없습니다" />}>
          <p className="desc" role="alert">연결을 확인한 뒤 다시 불러와 주세요.</p>
          <Button onClick={() => window.location.reload()}>다시 불러오기</Button>
        </Screen>
      )
    }
    return this.props.children
  }
}
