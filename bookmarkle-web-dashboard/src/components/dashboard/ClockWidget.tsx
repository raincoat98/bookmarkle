import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WeatherWidget } from "../widgets/WeatherWidget";

export const ClockWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const ampm =
    hours24 >= 12
      ? i18n.language === "ko" ? "오후" : i18n.language === "ja" ? "午後" : "PM"
      : i18n.language === "ko" ? "오전" : i18n.language === "ja" ? "午前" : "AM";

  const locale =
    i18n.language === "ko" ? "ko-KR" : i18n.language === "ja" ? "ja-JP" : "en-US";

  const dateStr = now.toLocaleDateString(locale, {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {/* 시계 */}
      <div className="sm:col-span-2 relative bg-white dark:bg-[#111113] rounded-xl border border-gray-200/80 dark:border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4 flex flex-col items-center justify-center text-center overflow-hidden min-h-[110px] sm:min-h-[120px]">
        {/* 배경 글로우 */}
        <div className="absolute w-32 h-32 rounded-full bg-violet-500/[0.07] dark:bg-violet-500/[0.10] blur-2xl -top-8 -left-6 pointer-events-none" />
        <div className="absolute w-24 h-24 rounded-full bg-indigo-500/[0.05] dark:bg-indigo-500/[0.08] blur-xl -bottom-6 right-2 pointer-events-none" />

        {/* AM/PM 뱃지 */}
        <span className="relative text-[10px] font-semibold text-violet-500 dark:text-violet-400 tracking-[0.22em] uppercase mb-1.5">
          {ampm}
        </span>

        {/* 메인 시간 */}
        <div className="relative flex items-baseline tabular-nums leading-none">
          <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">
            {hours12.toString().padStart(2, "0")}
            <span className="text-gray-300 dark:text-white/20 mx-0.5">:</span>
            {minutes}
          </span>
          <span className="text-base sm:text-lg font-normal text-gray-400 dark:text-white/30 mb-0.5 ml-0.5">
            :{seconds}
          </span>
        </div>

        {/* 날짜 */}
        <p className="relative text-[11px] text-gray-400 dark:text-white/35 mt-2 tracking-wide font-medium">
          {dateStr}
        </p>
      </div>

      {/* 날씨 */}
      <div className="sm:col-span-3">
        <WeatherWidget />
      </div>
    </div>
  );
};
