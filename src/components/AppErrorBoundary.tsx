import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[App] Runtime crash:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-fallback">
        <div className="app-fallback-panel">
          <div className="section-heading">Console interrupted</div>
          <h1>The plant console hit a runtime error.</h1>
          <p>
            The landing page and auth are still working. Refresh the console once; if this appears again, the message
            below points to the failing backend or component.
          </p>
          <pre>{this.state.error.message}</pre>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh console
          </button>
        </div>
      </div>
    );
  }
}
