import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, X, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  LocationSearchResult,
  OpenWeatherGeocodeResult,
} from "./weatherTypes";
import { ConfirmModal } from "./WeatherModals";

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    lat: number;
    lon: number;
    city: string;
  }) => Promise<void>;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // 모달이 닫힐 때 검색 상태 초기화
  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSaving(false);
    onClose();
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        throw new Error("API 키가 설정되지 않았습니다");
      }

      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          query
        )}&limit=5&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error("위치 검색 API 호출 실패");
      }

      const data = (await response.json()) as OpenWeatherGeocodeResult[];
      setSearchResults(
        data.map((item) => {
          // 한국어 이름이 있으면 우선 사용, 없으면 원래 이름 사용
          const displayName = item.local_names?.ko || item.name;

          return {
            name: displayName,
            lat: item.lat,
            lon: item.lon,
            country: item.country,
            state: item.state,
          };
        })
      );
    } catch (error) {
      console.error("위치 검색 실패:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(searchQuery);
  };

  const handleSelectLocation = async (location: LocationSearchResult) => {
    setSaving(true);
    try {
      const cityName = `${location.name}${
        location.state ? `, ${location.state}` : ""
      }${location.country ? `, ${location.country}` : ""}`;

      // 위치 저장 및 날씨 업데이트
      await onSelectLocation({
        lat: location.lat,
        lon: location.lon,
        city: cityName,
      });

      // 성공 시 모달 닫기
      handleClose();
    } catch (error) {
      console.error("위치 저장 실패:", error);
      setErrorModal({
        isOpen: true,
        title: t("weather.locationSaveError") || "위치 저장 오류",
        message:
          t("weather.locationSaveError") || "위치 저장 중 오류가 발생했습니다.",
      });
      // 에러 발생 시 모달은 열어둠 (사용자가 다시 시도할 수 있도록)
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    console.log("현재 위치 사용 버튼 클릭");

    if (!navigator.geolocation) {
      console.error("Geolocation API를 지원하지 않습니다");
      setErrorModal({
        isOpen: true,
        title: t("weather.geolocationNotSupported") || "위치 서비스 미지원",
        message:
          t("weather.geolocationNotSupported") ||
          "이 브라우저는 위치 서비스를 지원하지 않습니다.",
      });
      return;
    }

    console.log("Geolocation API 호출 시작");
    setIsSearching(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log("위치 정보 가져오기 성공:", {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        try {
          const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
          if (!API_KEY) {
            throw new Error("API 키가 설정되지 않았습니다");
          }

          console.log("역 지오코딩 API 호출 시작");
          // 역 지오코딩으로 도시 이름 가져오기
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${API_KEY}`
          );

          if (!response.ok) {
            throw new Error(`역 지오코딩 API 호출 실패: ${response.status}`);
          }

          const data = (await response.json()) as OpenWeatherGeocodeResult[];
          console.log("역 지오코딩 결과:", data);

          // 실제 GPS 좌표 사용 (역 지오코딩 응답의 좌표가 아닌)
          const actualLat = position.coords.latitude;
          const actualLon = position.coords.longitude;

          if (data.length > 0) {
            const location = data[0];
            // 한국어 이름이 있으면 우선 사용, 없으면 원래 이름 사용
            const displayName = location.local_names?.ko || location.name;
            console.log("위치 선택:", { displayName, actualLat, actualLon });

            // handleSelectLocation 호출 (모달이 닫히고 위치가 저장됨)
            await handleSelectLocation({
              name: displayName,
              lat: actualLat,
              lon: actualLon,
              country: location.country || "",
              state: location.state,
            });
            console.log("위치 저장 완료");
            // 로딩 상태 해제 (handleSelectLocation이 완료된 후)
            setIsSearching(false);
          } else {
            // 위치를 찾을 수 없어도 좌표만 저장
            const cityName = t("weather.currentLocation");
            console.log("위치 이름 없음, 좌표만 저장:", {
              cityName,
              actualLat,
              actualLon,
            });
            await handleSelectLocation({
              name: cityName,
              lat: actualLat,
              lon: actualLon,
              country: "",
            });
            console.log("위치 저장 완료 (좌표만)");
            // 로딩 상태 해제 (handleSelectLocation이 완료된 후)
            setIsSearching(false);
          }
        } catch (error) {
          console.error("현재 위치 가져오기 실패:", error);
          setIsSearching(false);
          const errorMessage =
            error instanceof Error ? error.message : "알 수 없는 오류";
          setErrorModal({
            isOpen: true,
            title:
              t("weather.locationFetchError") ||
              "위치 정보를 가져올 수 없습니다",
            message: `${
              t("weather.locationFetchError") ||
              "위치 정보를 가져올 수 없습니다."
            }\n\n${errorMessage}`,
          });
        }
      },
      (error: GeolocationPositionError) => {
        console.error("위치 정보 가져오기 실패:", {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });
        setIsSearching(false);

        if (error.code === error.TIMEOUT) {
          // 타임아웃 발생 시 사용자에게 선택권 제공
          setConfirmModal({
            isOpen: true,
            title: t("weather.geolocationTimeout") || "위치 요청 시간 초과",
            message:
              t("weather.geolocationTimeout") +
              "\n\n" +
              (t("weather.useDefaultLocation") ||
                "기본 위치(서울역)를 사용하시겠습니까?"),
            onConfirm: () => {
              // 기본 위치(서울역) 사용
              const defaultLat = 37.5547;
              const defaultLon = 126.9706;
              const cityName = "서울역, 대한민국";

              console.log("기본 위치 사용:", {
                defaultLat,
                defaultLon,
                cityName,
              });
              // onSelectLocation을 직접 호출하여 위치 저장 및 날씨 업데이트
              onSelectLocation({
                lat: defaultLat,
                lon: defaultLon,
                city: cityName,
              })
                .then(() => {
                  handleClose();
                })
                .catch((err) => {
                  console.error("기본 위치 저장 실패:", err);
                  setErrorModal({
                    isOpen: true,
                    title: t("weather.locationSaveError") || "위치 저장 오류",
                    message:
                      t("weather.locationSaveError") ||
                      "위치 저장 중 오류가 발생했습니다.",
                  });
                });
              setConfirmModal({
                isOpen: false,
                title: "",
                message: "",
                onConfirm: () => {},
              });
            },
          });
        } else {
          let errorMessage =
            t("weather.geolocationError") || "위치 정보를 가져올 수 없습니다.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage =
              t("weather.geolocationPermissionDenied") ||
              "위치 권한이 거부되었습니다.\n\n브라우저 설정에서 위치 권한을 허용해주세요.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage =
              t("weather.geolocationUnavailable") ||
              "위치 정보를 사용할 수 없습니다.\n\nGPS 또는 네트워크 위치 서비스를 확인해주세요.";
          }
          setErrorModal({
            isOpen: true,
            title: t("weather.geolocationError") || "위치 정보 오류",
            message: errorMessage,
          });
        }
      },
      {
        timeout: 20000, // 20초로 증가
        enableHighAccuracy: false,
        maximumAge: 60000, // 1분 이내 캐시된 위치 정보 사용
      }
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("weather.changeLocation")}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchLocation(e.target.value);
                    }}
                    placeholder={t("weather.searchPlaceholder")}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </form>

            <button
              onClick={handleUseCurrentLocation}
              disabled={isSearching}
              className="w-full mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {t("weather.useCurrentLocation")}
            </button>

            {isSearching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("weather.searching")}
                </p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("weather.selectLocation")}
                </p>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectLocation(result)}
                    disabled={saving}
                    className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.name}
                          {result.state && `, ${result.state}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {result.country}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isSearching &&
              searchQuery &&
              searchResults.length === 0 &&
              searchQuery.trim() && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("weather.noResults")}
                  </p>
                </div>
              )}
          </div>
        </motion.div>
      </div>

      {/* 에러 모달 */}
      <ConfirmModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onConfirm={() =>
          setErrorModal({ isOpen: false, title: "", message: "" })
        }
        onClose={() => setErrorModal({ isOpen: false, title: "", message: "" })}
      />

      {/* 확인 모달 */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 ${
          confirmModal.isOpen ? "" : "hidden"
        }`}
        onClick={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {confirmModal.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
            {confirmModal.message}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() =>
                setConfirmModal({
                  isOpen: false,
                  title: "",
                  message: "",
                  onConfirm: () => {},
                })
              }
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm();
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              확인
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};
