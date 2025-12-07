/**
 * Cloud Logging対応のロガー
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface LogEntry {
  severity: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  trace?: string;
  sourceLocation?: {
    file: string;
    line: number;
    function: string;
  };
  httpRequest?: {
    requestMethod: string;
    requestUrl: string;
    status: number;
    userAgent: string;
    remoteIp: string;
  };
  [key: string]: any;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      severity: level,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (this.isProduction) {
      // Cloud Loggingに構造化ログとして出力
      console.log(JSON.stringify(entry));
    } else {
      // 開発環境では読みやすい形式で出力
      console.log(`[${level}] ${message}`, data || '');
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARNING, message, data);
  }

  error(message: string, error?: Error | any, data?: any) {
    this.log(LogLevel.ERROR, message, {
      error: error?.message || error,
      stack: error?.stack,
      ...data,
    });
  }

  critical(message: string, error?: Error | any, data?: any) {
    this.log(LogLevel.CRITICAL, message, {
      error: error?.message || error,
      stack: error?.stack,
      ...data,
    });
  }

  // HTTP リクエストのログ
  httpRequest(
    method: string,
    url: string,
    status: number,
    userAgent: string,
    remoteIp: string,
    data?: any
  ) {
    this.log(LogLevel.INFO, `${method} ${url} ${status}`, {
      httpRequest: {
        requestMethod: method,
        requestUrl: url,
        status,
        userAgent,
        remoteIp,
      },
      ...data,
    });
  }
}

export const logger = new Logger();
