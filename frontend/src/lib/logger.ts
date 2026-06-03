type LogContext = Record<string, unknown>;
type LogLevel = 'debug' | 'info' | 'warning' | 'error';

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'html', 'code'];

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))
        ? '[redacted]'
        : value,
    ]),
  );
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const safeContext = redactContext(context);
  const payload = safeContext ? [`[${level}] ${message}`, safeContext] : [`[${level}] ${message}`];

  if (level === 'warning') {
    console.warn(...payload);
    return;
  }

  if (level === 'error') {
    console.error(...payload);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(...payload);
  }
}

export const appLogger = {
  debug(message: string, context?: LogContext) {
    emit('debug', message, context);
  },
  info(message: string, context?: LogContext) {
    emit('info', message, context);
  },
  warning(message: string, context?: LogContext) {
    emit('warning', message, context);
  },
  error(message: string, context?: LogContext) {
    emit('error', message, context);
  },
};
