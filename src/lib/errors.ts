export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
