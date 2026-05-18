import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Что-то пошло не так
          </h1>
          <p className="text-sm text-muted-foreground">
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          {error.message ? (
            <pre className="text-left text-xs bg-muted text-muted-foreground rounded-md p-3 overflow-auto max-h-40">
              {error.message}
            </pre>
          ) : null}
          <Button onClick={this.handleReload}>Перезагрузить</Button>
        </div>
      </div>
    );
  }
}
