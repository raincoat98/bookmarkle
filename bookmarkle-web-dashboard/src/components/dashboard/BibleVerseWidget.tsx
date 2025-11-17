import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import bibleVersesKo from "../../data/bibleVerses.json";
import bibleVersesEn from "../../data/bibleVerses.en.json";

interface BibleVerseEntry {
  verse: string;
  reference: string;
}

interface BibleVersesData {
  verses: BibleVerseEntry[];
  _copyright: {
    notice: string;
  };
}

const backgrounds = [
  "bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90",
  "bg-gradient-to-br from-indigo-900/90 via-blue-900/90 to-cyan-900/90",
  "bg-gradient-to-br from-cyan-900/90 via-blue-900/90 to-indigo-900/90",
  "bg-gradient-to-br from-sky-900/90 via-blue-900/90 to-slate-900/90",
  "bg-gradient-to-br from-blue-800/90 via-indigo-800/90 to-purple-800/90",
  "bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-red-900/90",
  "bg-gradient-to-br from-violet-900/90 via-purple-900/90 to-indigo-900/90",
  "bg-gradient-to-br from-rose-900/90 via-pink-900/90 to-purple-900/90",
  "bg-gradient-to-br from-fuchsia-900/90 via-purple-900/90 to-violet-900/90",
  "bg-gradient-to-br from-pink-800/90 via-rose-800/90 to-red-800/90",
  "bg-gradient-to-br from-emerald-900/90 via-teal-900/90 to-blue-900/90",
  "bg-gradient-to-br from-teal-900/90 via-cyan-900/90 to-blue-900/90",
  "bg-gradient-to-br from-green-900/90 via-emerald-900/90 to-teal-900/90",
  "bg-gradient-to-br from-lime-800/90 via-green-800/90 to-emerald-800/90",
  "bg-gradient-to-br from-orange-900/90 via-red-900/90 to-pink-900/90",
  "bg-gradient-to-br from-amber-900/90 via-orange-900/90 to-red-900/90",
  "bg-gradient-to-br from-yellow-800/90 via-amber-800/90 to-orange-800/90",
  "bg-gradient-to-br from-red-900/90 via-rose-900/90 to-pink-900/90",
  "bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-zinc-900/90",
  "bg-gradient-to-br from-gray-900/90 via-slate-900/90 to-stone-900/90",
  "bg-gradient-to-br from-zinc-900/90 via-neutral-900/90 to-stone-900/90",
  "bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-teal-900/90",
  "bg-gradient-to-br from-rose-900/90 via-orange-900/90 to-amber-900/90",
  "bg-gradient-to-br from-emerald-900/90 via-blue-900/90 to-purple-900/90",
  "bg-gradient-to-br from-indigo-900/90 via-pink-900/90 to-red-900/90",
  "bg-gradient-to-br from-teal-900/90 via-purple-900/90 to-rose-900/90",
  "bg-gradient-to-tr from-blue-900/90 via-purple-900/90 to-pink-900/90",
  "bg-gradient-to-tl from-emerald-900/90 via-cyan-900/90 to-blue-900/90",
  "bg-gradient-to-bl from-violet-900/90 via-indigo-900/90 to-blue-900/90",
  "bg-gradient-to-r from-orange-900/90 via-red-900/90 to-rose-900/90",
];

export const BibleVerseWidget: React.FC = () => {
  const { t, i18n } = useTranslation();

  // 언어에 따라 적절한 성경 구절 데이터 선택
  const bibleVersesData = useMemo(() => {
    const lang = i18n.language.toLowerCase();
    const isEnglishOrJapanese =
      lang === "en" ||
      lang.startsWith("en") ||
      lang === "ja" ||
      lang.startsWith("ja");
    return (
      isEnglishOrJapanese ? bibleVersesEn : bibleVersesKo
    ) as BibleVersesData;
  }, [i18n.language]);

  const [currentVerse, setCurrentVerse] = useState<BibleVerseEntry>(() => {
    const randomIndex = Math.floor(
      Math.random() * bibleVersesData.verses.length
    );
    return bibleVersesData.verses[randomIndex];
  });
  const [copied, setCopied] = useState(false);
  const [backgroundIndex] = useState(() =>
    Math.floor(Math.random() * backgrounds.length)
  );

  const handleCopyVerse = async () => {
    if (!currentVerse) {
      return;
    }

    const textToCopy = `"${currentVerse.verse}" - ${currentVerse.reference}`;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      } catch (error) {
        console.error("Clipboard API 복사 실패:", error);
      }
    }

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
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        alert("복사 기능을 사용할 수 없습니다. 브라우저가 지원하지 않습니다.");
      }
    } catch (fallbackError) {
      console.error("모든 복사 방법 실패:", fallbackError);
      alert(
        "복사 기능을 사용할 수 없습니다. 수동으로 텍스트를 선택해서 복사해주세요."
      );
    }
  };

  useEffect(() => {
    const randomIndex = Math.floor(
      Math.random() * bibleVersesData.verses.length
    );
    setCurrentVerse(bibleVersesData.verses[randomIndex]);
  }, [bibleVersesData]);

  const renderVerseWithBreaks = () => {
    const verse = currentVerse.verse;
    const lang = i18n.language.toLowerCase();
    const isEnglishOrJapanese =
      lang === "en" ||
      lang.startsWith("en") ||
      lang === "ja" ||
      lang.startsWith("ja");

    // 한국어 구절 분리 패턴
    const koreanBreakPatterns = [
      " 그리하면 ",
      " 그러므로 ",
      " 하지만 ",
      " 그런데 ",
      " 왜냐하면 ",
      " 그리고 ",
    ];

    // 영어 구절 분리 패턴
    const englishBreakPatterns = [
      " so that ",
      " therefore ",
      " but ",
      " however ",
      " because ",
      " and ",
      " for ",
    ];

    const breakPatterns = isEnglishOrJapanese
      ? englishBreakPatterns
      : koreanBreakPatterns;

    for (const pattern of breakPatterns) {
      if (verse.includes(pattern)) {
        const parts = verse.split(pattern);
        return (
          <>
            "{parts[0]}
            {pattern.trim()}
            <br />
            {parts.slice(1).join(pattern)}"
          </>
        );
      }
    }

    const commaIndex = verse.indexOf(",");
    if (commaIndex > 10 && commaIndex < verse.length - 10) {
      return (
        <>
          "{verse.substring(0, commaIndex + 1)}
          <br />
          {verse.substring(commaIndex + 1).trim()}"
        </>
      );
    }

    const words = verse.split(" ");
    if (words.length > 8) {
      const midPoint = Math.floor(words.length / 2);
      return (
        <>
          "{words.slice(0, midPoint).join(" ")}
          <br />
          {words.slice(midPoint).join(" ")}"
        </>
      );
    }

    return `"${verse}"`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateX: -15 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotateX: 0,
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-2xl md:rounded-3xl ${backgrounds[backgroundIndex]} backdrop-blur-xl border border-white/20 shadow-2xl min-h-[280px] sm:min-h-[320px] md:min-h-[400px] flex items-center cursor-pointer`}
      onClick={handleCopyVerse}
      title={copied ? t("dashboard.copied") : t("dashboard.clickToCopyVerse")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopyVerse();
        }
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{ zIndex: -10 }}>
        <div
          className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]"
          style={{
            animation: "spin 60s linear infinite",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05)_0%,transparent_50%)]"
          style={{
            animation: "spin 90s linear infinite reverse",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)]"
          style={{
            animation: "ping 8s cubic-bezier(0, 0, 0.2, 1) infinite",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-bounce duration-[3000ms]"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-3/4 right-1/4 w-1 h-1 bg-white/30 rounded-full animate-bounce duration-[4000ms] delay-1000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce duration-[3500ms] delay-2000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-1/3 right-1/2 w-1 h-1 bg-white/15 rounded-full animate-bounce duration-[2800ms] delay-500"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce duration-[3200ms] delay-1500"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-2/3 left-2/3 w-1 h-1 bg-white/25 rounded-full animate-bounce duration-[3600ms] delay-3000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse duration-[8000ms]"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/3 to-transparent animate-pulse duration-[12000ms] delay-2000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-transparent via-white/2 to-transparent animate-pulse duration-[10000ms] delay-4000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60"
          style={{
            animation: "float-horizontal 15s infinite ease-in-out",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40"
          style={{
            animation: "float-horizontal-reverse 20s infinite ease-in-out",
            zIndex: -10,
          }}
        ></div>
      </div>

      <motion.div
        className="relative p-4 sm:p-6 md:p-8 lg:p-12 text-center w-full"
        style={{ zIndex: 100 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <motion.div
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <div
            className="inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 shadow-lg relative"
            style={{ zIndex: 200 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="w-5 h-5 text-white/80" />
            </motion.div>
            <span className="text-white/80 text-sm font-medium">
              {copied ? t("dashboard.copied") : t("dashboard.todaysBibleVerse")}
            </span>
          </div>
        </motion.div>

        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-4 right-4 bg-white/90 text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-xl backdrop-blur-sm border border-white/20 flex items-center space-x-2"
            style={{ zIndex: 300 }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              ✓
            </motion.div>
            <span>{t("dashboard.copied")}</span>
          </motion.div>
        )}

        <div className="space-y-8">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
          >
            <motion.div
              className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 1.5, duration: 1 }}
            ></motion.div>
            <motion.div
              className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-light text-white leading-relaxed tracking-wide px-2 sm:px-3 md:px-4 relative"
              style={{
                zIndex: 200,
                textShadow:
                  "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)",
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
              }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
            >
              {renderVerseWithBreaks()}
            </motion.div>
            <motion.div
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 2, duration: 1 }}
            ></motion.div>
          </motion.div>

          <motion.div
            className="pt-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            <p
              className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 font-medium tracking-wide relative"
              style={{
                zIndex: 200,
                textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
              }}
            >
              {currentVerse.reference}
            </p>
            <p
              className="text-xs text-white/70 mt-2 font-light tracking-wide relative"
              style={{
                zIndex: 200,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {bibleVersesData._copyright.notice}
            </p>
          </motion.div>
        </div>

        <motion.div
          className="absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 w-12 sm:w-16 md:w-20 lg:w-24 h-12 sm:h-16 md:h-20 lg:h-24 bg-white/5 rounded-full backdrop-blur-sm border border-white/10"
          style={{ zIndex: 50 }}
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        <motion.div
          className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 w-10 sm:w-14 md:w-16 lg:w-20 h-10 sm:h-14 md:h-16 lg:h-20 bg-white/5 rounded-full backdrop-blur-sm border border-white/10"
          style={{ zIndex: 50 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        ></motion.div>
        <motion.div
          className="absolute top-1/4 left-4 sm:left-6 md:left-8 w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 bg-white/3 rounded-full backdrop-blur-sm"
          style={{ zIndex: 50 }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        <motion.div
          className="absolute bottom-1/4 right-6 sm:right-8 md:right-10 lg:right-12 w-8 sm:w-10 md:w-12 lg:w-16 h-8 sm:h-10 md:h-12 lg:h-16 bg-white/3 rounded-full backdrop-blur-sm"
          style={{ zIndex: 50 }}
          animate={{
            x: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        ></motion.div>
      </motion.div>
    </motion.div>
  );
};
