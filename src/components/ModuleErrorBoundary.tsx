import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorLogger } from '@/lib/errorLogger';

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

const moduleConfig = {
  admin: {
    title: 'Admin Module Error',
    description: 'Something went wrong in the admin section.',
    icon: '🔧',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  family: {
    title: 'Family Module Error',
    description: 'Something went wrong in the family section.',
    icon: '👨‍👩‍👧‍👦',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  auth: {
    title: 'Authentication Error',
    description: 'Something went wrong with authentication.',
    icon: '🔐',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  general: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred.',
    icon: '⚠️',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

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
    const config = moduleConfig[moduleName];

    if (this.state.hasError) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${config.bgColor}`}>
          <Card className="max-w-lg w-full shadow-lg">
            <CardHeader className="text-center">
              <div className="text-4xl mb-3">{config.icon}</div>
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className={`h-6 w-6 ${config.color}`} />
                <CardTitle className={config.color}>{config.title}</CardTitle>
              </div>
              <CardDescription className="mt-2">
                {config.description} The rest of the application should still work normally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-mono text-sm text-destructive mb-2">
                    {this.state.error.message}
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View error details
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-background rounded">
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoBack} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support with error reference: {' '}
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
