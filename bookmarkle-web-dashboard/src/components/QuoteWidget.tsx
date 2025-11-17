import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import bibleVersesKo from "../data/bibleVerses.json";
import bibleVersesEn from "../data/bibleVerses.en.json";

interface BibleVerse {
  verse: string;
  reference: string;
}

interface BibleData {
  _copyright: {
    notice: string;
    permission: string;
    source: string;
  };
  verses: BibleVerse[];
}

// 아름다운 그라데이션 배경 색상 배열
const gradientBackgrounds = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)",
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(135deg, #a6c0fe 0%, #f68084 100%)",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)",
  "linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)",
];

export const BibleVerseWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundGradient, setBackgroundGradient] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // 언어에 따라 적절한 성경 구절 데이터 선택
  const bibleVersesData = useMemo(() => {
    const lang = i18n.language.toLowerCase();
    const isEnglishOrJapanese = 
      lang === "en" || 
      lang.startsWith("en") || 
      lang === "ja" || 
      lang.startsWith("ja");
    return (isEnglishOrJapanese ? bibleVersesEn : bibleVersesKo) as BibleData;
  }, [i18n.language]);

  // 마운트 시에만 실행되는 랜덤 구절 선택 함수 (메모이제이션)
  const getRandomVerse = useCallback((): BibleVerse => {
    const data = bibleVersesData as BibleData;
    const index = Math.floor(Math.random() * data.verses.length);
    return data.verses[index];
  }, [bibleVersesData]); // bibleVersesData를 dependency로 추가

  // 마운트 시에만 실행되는 랜덤 배경 그라데이션 선택 함수 (메모이제이션)
  const getRandomGradient = useCallback((): string => {
    const index = Math.floor(Math.random() * gradientBackgrounds.length);
    return gradientBackgrounds[index];
  }, []); // 빈 dependency로 마운트 시에만 생성

  // 성경말씀 복사 기능
  const handleCopyVerse = useCallback(async () => {
    if (!verse) {
      console.log("복사할 말씀이 없습니다.");
      return;
    }

    const textToCopy = `"${verse.verse}" - ${verse.reference}`;
    console.log("복사 시도:", textToCopy);

    // 현대적인 Clipboard API 시도
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        console.log("Clipboard API로 복사 성공");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      } catch (error) {
        console.error("Clipboard API 복사 실패:", error);
      }
    }

    // Fallback: execCommand 방법
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        console.log("execCommand로 복사 성공");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        console.error("execCommand 복사 실패");
        alert("복사 기능을 사용할 수 없습니다. 브라우저가 지원하지 않습니다.");
      }
    } catch (fallbackError) {
      console.error("모든 복사 방법 실패:", fallbackError);
      alert(
        "복사 기능을 사용할 수 없습니다. 수동으로 텍스트를 선택해서 복사해주세요."
      );
    }
  }, [verse]);

  // 마운트 시에만 랜덤 구절과 배경 설정
  useEffect(() => {
    setLoading(true);
    setVerse(getRandomVerse());
    setBackgroundGradient(getRandomGradient());
    setLoading(false);
  }, [getRandomVerse, getRandomGradient, bibleVersesData]); // bibleVersesData도 dependency로 추가

  if (loading) {
    return (
      <div
        className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center"
        style={{ background: backgroundGradient || gradientBackgrounds[0] }}
      >
        <div className="animate-pulse flex items-center space-x-3">
          <BookOpen className="w-5 h-5 text-white opacity-80" />
          <div className="h-4 bg-white/20 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!verse) return null;

  return (
    <div
      className="rounded-lg shadow-sm border border-gray-200/20 p-6 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
      style={{ background: backgroundGradient }}
      onClick={(e) => {
        console.log("성경말씀 위젯 클릭됨");
        e.preventDefault();
        e.stopPropagation();
        handleCopyVerse();
      }}
      title={copied ? "복사됨!" : "클릭하여 성경말씀 복사"}
      aria-label="성경말씀을 클립보드에 복사하려면 클릭하세요"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopyVerse();
        }
      }}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300"></div>

      {/* 복사 상태 표시 */}
      {copied && (
        <div className="absolute top-4 right-4 bg-white/90 text-gray-800 px-3 py-1 rounded-full text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          복사됨!
        </div>
      )}

      <div className="relative z-10 flex items-start space-x-3">
        <BookOpen className="w-5 h-5 text-white mt-1 flex-shrink-0 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
        <div className="flex-1">
          <p className="text-base text-white leading-relaxed font-medium drop-shadow-sm group-hover:text-white/95 transition-colors duration-300">
            "{verse.verse}"
          </p>
          <p className="text-sm text-white/90 mt-3 text-right italic drop-shadow-sm group-hover:text-white/80 transition-colors duration-300">
            {verse.reference}
          </p>
          <p className="text-xs text-white/70 mt-2 text-right drop-shadow-sm">
            {(bibleVersesData as BibleData)._copyright.notice}
          </p>
        </div>
      </div>
    </div>
  );
};
