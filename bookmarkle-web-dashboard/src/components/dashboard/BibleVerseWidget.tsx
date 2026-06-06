import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Copy, Check, Palette, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import bibleVersesKo from "../../data/bibleVerses.json";
import bibleVersesEn from "../../data/bibleVerses.en.json";

interface BibleVerseEntry {
  verse: string;
  reference: string;
}

interface BibleVersesData {
  verses: BibleVerseEntry[];
  _copyright: { notice: string };
}

const PRESET_BG = [
  { id: "dark",     bg: "#1a1a2e" },
  { id: "violet",   bg: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #4338ca 100%)" },
  { id: "midnight", bg: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2d2b6b 100%)" },
  { id: "sunset",   bg: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 40%, #6b21a8 100%)" },
  { id: "ocean",    bg: "linear-gradient(135deg, #1e40af 0%, #0369a1 50%, #0f766e 100%)" },
  { id: "forest",   bg: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #1e6b3c 100%)" },
  { id: "aurora",   bg: "linear-gradient(135deg, #3730a3 0%, #7e22ce 50%, #9d174d 100%)" },
  { id: "golden",   bg: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #92400e 100%)" },
];

const LS_KEY = "bible-verse-bg";

type BgType = { type: "preset"; id: string } | { type: "image"; url: string };
type BgBehavior = "fixed" | "random";

interface StoredConfig {
  behavior: BgBehavior;
  bg: BgType;
}

function getBgStyle(bg: BgType): React.CSSProperties {
  if (bg.type === "image") {
    return { backgroundImage: `url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  const preset = PRESET_BG.find((p) => p.id === bg.id);
  return { background: preset?.bg ?? "#111113" };
}

function randomPreset(): BgType {
  const presets = PRESET_BG.filter((p) => p.id !== "dark");
  const idx = Math.floor(Math.random() * presets.length);
  return { type: "preset", id: presets[idx].id };
}

function loadConfig(): StoredConfig {
  const fallback: StoredConfig = { behavior: "fixed", bg: { type: "preset", id: "dark" } };
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    // 구 포맷 마이그레이션: { type, id } | { type, url }
    if (parsed && parsed.type && !parsed.behavior) {
      return { behavior: "fixed", bg: parsed as BgType };
    }
    // 새 포맷 검증
    if (parsed && parsed.behavior && parsed.bg && parsed.bg.type) {
      return parsed as StoredConfig;
    }
  } catch {}
  return fallback;
}

export const BibleVerseWidget: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [config, setConfig] = useState<StoredConfig>(() => {
    const c = loadConfig();
    if (c.behavior === "random") return { ...c, bg: randomPreset() };
    return c;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(
    config.bg.type === "image" ? config.bg.url : ""
  );
  const [copied, setCopied] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const bibleVersesData = useMemo(() => {
    const lang = i18n.language.toLowerCase();
    const isEnOrJa = lang === "en" || lang.startsWith("en") || lang === "ja" || lang.startsWith("ja");
    return (isEnOrJa ? bibleVersesEn : bibleVersesKo) as BibleVersesData;
  }, [i18n.language]);

  const [currentVerse, setCurrentVerse] = useState<BibleVerseEntry>(() => {
    const idx = Math.floor(Math.random() * bibleVersesData.verses.length);
    return bibleVersesData.verses[idx];
  });

  useEffect(() => {
    const idx = Math.floor(Math.random() * bibleVersesData.verses.length);
    setCurrentVerse(bibleVersesData.verses[idx]);
  }, [bibleVersesData]);

  useEffect(() => {
    if (!showSettings) return;
    const handle = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showSettings]);

  const saveConfig = (next: StoredConfig) => {
    setConfig(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  };

  const applyPreset = (id: string) => {
    saveConfig({ ...config, bg: { type: "preset", id } });
  };

  const applyImage = (url: string) => {
    saveConfig({ ...config, bg: { type: "image", url } });
  };

  const setBehavior = (behavior: BgBehavior) => {
    const next: StoredConfig = { behavior, bg: behavior === "random" ? randomPreset() : config.bg };
    saveConfig(next);
  };

  const handleCopy = async () => {
    if (showSettings) return;
    const text = `"${currentVerse.verse}" - ${currentVerse.reference}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:fixed;left:-9999px";
        document.body.appendChild(el);
        el.focus(); el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    // overflow-visible so the settings panel is NOT clipped
    <div
      className="relative rounded-xl border border-white/[0.06] cursor-pointer group"
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      title={copied ? t("dashboard.copied") : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCopy(); }
      }}
    >
      {/* 배경 레이어 */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={getBgStyle(config.bg)}
      >
        {config.bg.type === "image" && (
          <div className="absolute inset-0 bg-black/45" />
        )}

        {/* 플로팅 오브 */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-white/10 blur-3xl"
          style={{ top: "-30%", left: "-8%" }}
          animate={{ x: [0, 24, 0], y: [0, -16, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-56 h-56 rounded-full bg-white/[0.08] blur-2xl"
          style={{ bottom: "-20%", right: "5%" }}
          animate={{ x: [0, -18, 0], y: [0, 14, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute w-40 h-40 rounded-full bg-white/[0.06] blur-xl"
          style={{ top: "20%", right: "12%" }}
          animate={{ x: [0, 12, -8, 0], y: [0, -12, 6, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        {/* 장식 십자 파티클 */}
        {[
          { top: "15%", left: "8%", delay: 0 },
          { top: "70%", left: "20%", delay: 1.5 },
          { top: "25%", right: "22%", delay: 3 },
          { top: "65%", right: "10%", delay: 0.8 },
          { top: "45%", left: "40%", delay: 2.2 },
        ].map((pos, i) => (
          <motion.span
            key={i}
            className="absolute text-white/20 text-lg select-none"
            style={pos}
            animate={{ opacity: [0.15, 0.45, 0.15], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: pos.delay }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      {/* 본문 */}
      <div className="relative z-10 px-10 py-20 sm:px-16 sm:py-24 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen className="w-4 h-4 text-white/60 drop-shadow" />
          <span className="text-xs font-medium text-white/60 tracking-widest uppercase drop-shadow">
            {t("dashboard.todaysBibleVerse")}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentVerse.verse}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-2xl sm:text-3xl md:text-4xl font-light text-white leading-relaxed tracking-wide break-keep"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
          >
            "{currentVerse.verse}"
          </motion.p>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-base font-semibold text-white/80"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          {currentVerse.reference}
        </motion.p>
        <p className="mt-1.5 text-xs text-white/40 drop-shadow">
          {bibleVersesData._copyright.notice}
        </p>
      </div>

      {/* 복사 힌트 */}
      <div className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        {copied ? (
          <Check className="w-4 h-4 text-white/60" />
        ) : (
          <Copy className="w-4 h-4 text-white/30" />
        )}
      </div>

      {/* 배경 변경 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-colors z-20 ${
          showSettings
            ? "text-white/80 bg-white/15"
            : "text-white/30 hover:text-white/70 hover:bg-white/10 opacity-0 group-hover:opacity-100"
        }`}
        title={t("dashboard.changeBackground") ?? "배경 변경"}
      >
        <Palette className="w-4 h-4" />
      </button>

      {/* 배경 선택 패널 */}
      {showSettings && (
        <div
          ref={settingsRef}
          className="absolute top-12 right-2.5 z-30 w-64 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-sm border border-gray-200 dark:border-white/[0.10] rounded-xl shadow-2xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-white/60 uppercase tracking-wider">
              {t("dashboard.changeBackground") ?? "배경 변경"}
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-md text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 동작 옵션 */}
          <div className="flex gap-1.5 mb-3">
            {(["fixed", "random"] as BgBehavior[]).map((b) => (
              <button
                key={b}
                onClick={() => setBehavior(b)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  config.behavior === b
                    ? "bg-violet-600 text-white border border-violet-600"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.10] border border-gray-200 dark:border-white/[0.06]"
                }`}
              >
                {b === "fixed"
                  ? (t("dashboard.bgFixed") ?? "배경 고정")
                  : (t("dashboard.bgRandom") ?? "열때마다 변경")}
              </button>
            ))}
          </div>

          {/* 프리셋 스와치 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {PRESET_BG.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                  config.bg.type === "preset" && config.bg.id === preset.id
                    ? "border-violet-500 ring-2 ring-violet-400/30"
                    : "border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30"
                }`}
                style={{ background: preset.bg }}
              />
            ))}
          </div>

          {/* 이미지 URL */}
          <div className="border-t border-gray-200 dark:border-white/[0.08] pt-3 space-y-2">
            <p className="text-[10px] text-gray-400 dark:text-white/35 uppercase tracking-wider">
              {t("dashboard.backgroundImage") ?? "이미지 URL"}
            </p>
            <input
              type="text"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.10] rounded-lg text-gray-800 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && imageUrlInput.trim()) {
                  applyImage(imageUrlInput.trim());
                  setShowSettings(false);
                }
              }}
            />
            <button
              onClick={() => {
                if (imageUrlInput.trim()) {
                  applyImage(imageUrlInput.trim());
                  setShowSettings(false);
                }
              }}
              disabled={!imageUrlInput.trim()}
              className="w-full py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-white/70 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("common.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
