import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { WeatherWidget } from "../widgets/WeatherWidget";

export const ClockWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getLocale = () => {
    switch (i18n.language) {
      case "ko":
        return "ko-KR";
      case "ja":
        return "ja-JP";
      case "en":
        return "en-US";
      default:
        return "ko-KR";
    }
  };

  const dateStr = now.toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        whileHover={{ scale: 1.02 }}
        className="sm:col-span-2 card-glass p-2 sm:p-4 flex flex-col items-center justify-center text-center min-h-[100px] sm:min-h-[140px]"
      >
        <motion.div
          key={timeStr}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text tracking-wider mb-0.5 sm:mb-1"
        >
          {timeStr}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xs sm:text-sm text-gray-500 dark:text-gray-400"
        >
          {dateStr}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="sm:col-span-3"
      >
        <WeatherWidget />
      </motion.div>
    </motion.div>
  );
};
