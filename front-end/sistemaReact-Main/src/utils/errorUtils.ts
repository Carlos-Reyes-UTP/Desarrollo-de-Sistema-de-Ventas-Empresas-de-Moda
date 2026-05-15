export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const getHttpStatus = (error: unknown): number | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null &&
    'status' in ((error as { response?: { status?: unknown } }).response ?? {})
  ) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

export const getResponseMessage = (error: unknown): string | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null &&
    'data' in ((error as { response?: { data?: unknown } }).response ?? {})
  ) {
    const data = (error as { response?: { data?: { message?: unknown } } }).response?.data;
    return typeof data?.message === 'string' ? data.message : undefined;
  }
  return undefined;
};

export const getStatusCode = (error: unknown): number | undefined => {
  return getHttpStatus(error);
};
