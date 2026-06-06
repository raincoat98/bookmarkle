import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Chrome, Globe, Compass, Sparkles, ExternalLink } from "lucide-react";
import {
  detectBrowser,
  getBrowserCompatibilityMessage,
  getRecommendedBrowsers,
} from "../../utils/browserDetection";

interface BrowserCompatibilityWarningProps {
  className?: string;
}

const BROWSER_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; iconColor: string }
> = {
  Chrome: { icon: Chrome, iconColor: "text-blue-500" },
  Safari: { icon: Compass, iconColor: "text-blue-400" },
  Edge: { icon: Sparkles, iconColor: "text-cyan-500" },
  웨일: { icon: Globe, iconColor: "text-emerald-500" },
};

export const BrowserCompatibilityWarning: React.FC<
  BrowserCompatibilityWarningProps
> = ({ className = "" }) => {
  const { t } = useTranslation();
  const browserInfo = detectBrowser();
  const message = getBrowserCompatibilityMessage(browserInfo);
  const recommendedBrowsers = getRecommendedBrowsers();

  if (browserInfo.isCompatible) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-50 dark:from-amber-500/[0.08] dark:via-orange-500/[0.04] dark:to-amber-500/[0.08] ${className}`}
    >
      {/* 장식 글로우 */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-300/20 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* 아이콘 */}
          <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            {/* 제목 + 현재 브라우저 */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                {t("common.browserCompatibility")}
              </h4>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                {browserInfo.name}
              </span>
            </div>

            {/* 메시지 */}
            <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed mb-3">
              {message}
            </p>

            {/* 권장 브라우저 */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500/80 uppercase tracking-wider">
                {t("common.recommendedBrowsers")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recommendedBrowsers.map((browser: string) => {
                  const meta = BROWSER_META[browser] ?? {
                    icon: Globe,
                    iconColor: "text-gray-500",
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={browser}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-white/[0.06] border border-amber-100 dark:border-white/[0.06] text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm"
                    >
                      <Icon className={`w-3 h-3 ${meta.iconColor}`} />
                      <span>{browser}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 인앱 브라우저 안내 */}
            {browserInfo.isInAppBrowser && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-amber-100 dark:border-white/[0.06] rounded-xl">
                <ExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed">
                  <strong className="text-amber-900 dark:text-amber-300">
                    {t("common.info")}:
                  </strong>{" "}
                  {t("common.tipOpenInBrowser")}{" "}
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 font-medium">
                    {t("common.openInBrowser")}
                  </span>{" "}
                  {t("common.orExternal")}{" "}
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 font-medium">
                    {t("common.openInExternalBrowser")}
                  </span>{" "}
                  {t("common.optionToFind")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserCompatibilityWarning;
