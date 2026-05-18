import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router";
import { Button } from "./components/ui/button";

type FallbackProps = {
  message?: string;
};

function ErrorFallback({ message }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">
          Что-то пошло не так
        </h1>
        <p className="text-sm text-muted-foreground">
          Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
        </p>
        {message ? (
          <pre className="text-left text-xs bg-muted text-muted-foreground rounded-md p-3 overflow-auto max-h-40">
            {message}
          </pre>
        ) : null}
        <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
      </div>
    </div>
  );
}

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

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return <ErrorFallback message={error.message} />;
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : undefined;
  if (error) {
    console.error("RouteErrorBoundary caught error:", error);
  }
  return <ErrorFallback message={message} />;
}
