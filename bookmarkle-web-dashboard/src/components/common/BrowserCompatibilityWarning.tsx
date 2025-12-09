import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Chrome, Globe } from "lucide-react";
import {
  detectBrowser,
  getBrowserCompatibilityMessage,
  getRecommendedBrowsers,
} from "../../utils/browserDetection";

interface BrowserCompatibilityWarningProps {
  className?: string;
}

export const BrowserCompatibilityWarning: React.FC<
  BrowserCompatibilityWarningProps
> = ({ className = "" }) => {
  const { t } = useTranslation();
  const browserInfo = detectBrowser();
  const message = getBrowserCompatibilityMessage(browserInfo);
  const recommendedBrowsers = getRecommendedBrowsers();

  // 호환 가능한 브라우저면 경고를 표시하지 않음
  if (browserInfo.isCompatible) {
    return null;
  }

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 mb-2">
            {t("common.browserCompatibility")}
          </h4>
          <p className="text-sm text-amber-700 mb-3">{message}</p>

          <div className="space-y-2">
            <p className="text-xs text-amber-600 font-medium">{t("common.recommendedBrowsers")}</p>
            <div className="flex flex-wrap gap-2">
              {recommendedBrowsers.map((browser: string) => (
                <div
                  key={browser}
                  className="flex items-center space-x-1 bg-white px-2 py-1 rounded text-xs text-amber-700 border border-amber-200"
                >
                  {browser === "Chrome" && <Chrome className="w-3 h-3" />}
                  {browser === "Safari" && <Globe className="w-3 h-3" />}
                  {!["Chrome", "Safari"].includes(browser) && (
                    <Globe className="w-3 h-3" />
                  )}
                  <span>{browser}</span>
                </div>
              ))}
            </div>
          </div>

          {browserInfo.isInAppBrowser && (
            <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700">
              <strong>💡 {t("common.info")}:</strong> {t("common.tipOpenInBrowser")}{" "}
              <strong>"{t("common.openInBrowser")}"</strong> {t("common.orExternal")}{" "}
              <strong>"{t("common.openInExternalBrowser")}"</strong> {t("common.optionToFind")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowserCompatibilityWarning;
