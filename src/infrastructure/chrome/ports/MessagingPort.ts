// 応答付きメッセージの送信元。url は送った側のページ（content script ならそのページ）
export interface RequestSender {
  readonly url: string | null;
}

export interface MessagingPort {
  onMessage(handler: (msg: unknown) => void): void;
  // 応答が要るメッセージ用。accepts が false のメッセージには応答しない
  onRequest(
    accepts: (msg: unknown) => boolean,
    handler: (msg: unknown, sender: RequestSender) => Promise<unknown>,
  ): void;
  sendMessage(msg: unknown): Promise<void>;
  request(msg: unknown): Promise<unknown>;
  getExtensionUrl(path: string): string;
}
