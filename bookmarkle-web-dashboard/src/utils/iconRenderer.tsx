import * as LucideIcons from "lucide-react";

// Lucide 아이콘 이름인지 확인하는 함수
const isLucideIcon = (iconName: string): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(LucideIcons as any)[iconName];
};

// 이모지인지 확인하는 함수 (더 정확한 감지)
const isEmoji = (str: string): boolean => {
  // 이모지 정규식 패턴
  const emojiRegex =
    /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])+$/;

  return emojiRegex.test(str.trim());
};

export const renderCollectionIcon = (iconName: string, className?: string) => {
  // 기본값 설정
  if (!iconName || iconName.trim() === "") {
    return <LucideIcons.Folder className={className || "w-5 h-5"} />;
  }

  const trimmedIcon = iconName.trim();

  // 이모지인 경우
  if (isEmoji(trimmedIcon)) {
    return (
      <span
        className={`flex items-center justify-center ${className || "w-5 h-5"}`}
        style={{
          fontSize: "1.5em",
          fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif",
          lineHeight: 1,
          verticalAlign: "middle",
        }}
      >
        {trimmedIcon}
      </span>
    );
  }

  // Lucide 아이콘인 경우
  if (isLucideIcon(trimmedIcon)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[trimmedIcon];
    return <IconComponent className={className || "w-5 h-5"} />;
  }

  // 아이콘을 찾을 수 없는 경우 기본 아이콘 사용
  return <LucideIcons.Folder className={className || "w-5 h-5"} />;
};
