import type { DashboardData } from "../types";
import { buildStatusLines } from "./BannerInfo";
import { buildPopupBannerData } from "./PopupInfo";

export interface NotificationText {
  readonly title: string;
  readonly message: string;
}

const GENERATED_AT_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// 指定時刻の通知に載せる文面。ポップアップと同じ行を使い、太字や色は落とす。
// 値は KOT 画面を開いたときにしか更新されないため、いつのデータかを末尾に添える
export function buildNotificationText(data: DashboardData, now: Date): NotificationText {
  const lines = buildStatusLines(buildPopupBannerData(data, now)).map((line) =>
    line.map((seg) => seg.text).join(""),
  );
  const generatedAt = GENERATED_AT_FORMAT.format(new Date(data.generatedAt));
  return { title: "KotDiff", message: [...lines, `（${generatedAt} 時点）`].join("\n") };
}
