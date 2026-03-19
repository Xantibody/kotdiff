export interface MessagingPort {
  onMessage(handler: (msg: unknown) => void): void;
  sendMessage(msg: unknown): Promise<void>;
  getExtensionUrl(path: string): string;
}
