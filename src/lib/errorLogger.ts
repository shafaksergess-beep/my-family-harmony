interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  userId?: string;
  familyId?: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error | string, context?: Record<string, any>, level: 'error' | 'warning' | 'info' = 'error') {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
      timestamp: new Date().toISOString(),
      level,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console[level]('Error logged:', errorLog);
    }

    // TODO: Send to external logging service
    // this.sendToLoggingService(errorLog);

    return errorLog;
  }

  error(error: Error | string, context?: Record<string, any>) {
    return this.log(error, context, 'error');
  }

  warning(message: string, context?: Record<string, any>) {
    return this.log(message, context, 'warning');
  }

  info(message: string, context?: Record<string, any>) {
    return this.log(message, context, 'info');
  }

  private async sendToLoggingService(errorLog: ErrorLog) {
    // TODO: Implement integration with external logging service
    // Example: Sentry, LogRocket, or custom endpoint
    // try {
    //   await fetch('/api/log-error', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(errorLog),
    //   });
    // } catch (e) {
    //   console.error('Failed to send error log:', e);
    // }
  }
}

export const errorLogger = ErrorLogger.getInstance();
