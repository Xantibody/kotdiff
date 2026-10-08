// 画面やメッセージに載せるための、例外の文字列表現
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
