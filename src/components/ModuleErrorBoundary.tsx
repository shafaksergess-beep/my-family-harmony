import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorLogger } from '@/lib/errorLogger';
import i18n from '@/i18n/config';

interface Props {
  children: ReactNode;
  moduleName: 'admin' | 'family' | 'auth' | 'general';
  fallbackPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { moduleName } = this.props;
    
    // Log with module context
    errorLogger.error(error, {
      module: moduleName,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
    });

    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleGoHome = () => {
    const { fallbackPath } = this.props;
    window.location.href = fallbackPath || '/dashboard';
  };

  public render() {
    const { moduleName, children } = this.props;
    const t = i18n.t.bind(i18n);

    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full shadow-lg">
            <CardHeader className="text-center">
              
              <div className="flex flex-col items-center justify-center gap-3">
                <AlertCircle className="h-8 w-8 shrink-0 text-destructive" />
                <CardTitle>{t("screenRecovery.title")}</CardTitle>
              </div>
              <CardDescription className="mt-2">
                {t("screenRecovery.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-mono break-words text-sm text-destructive mb-2">
                    {this.state.error.message}
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {t("screenRecovery.details")}
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-background rounded">
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReset} variant="outline" className="min-w-0 flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("screenRecovery.retry")}
                </Button>
                <Button onClick={this.handleGoBack} variant="outline" className="min-w-0 flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("screenRecovery.back")}
                </Button>
                <Button onClick={this.handleGoHome} className="min-w-0 flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  {t("screenRecovery.dashboard")}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {t("screenRecovery.reference")} 
                <code className="bg-muted px-1 rounded">
                  {new Date().toISOString().slice(0, 10)}-{moduleName.toUpperCase()}
                </code>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}
