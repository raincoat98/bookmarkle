import React from "react";
import { useTranslation } from "react-i18next";

interface DeleteCollectionModalProps {
  isOpen: boolean;
  collectionName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const highlightWord = (text: string, words: string[]) => {
  const word = words.find((w) => text.toLowerCase().includes(w.toLowerCase()));
  if (!word) return <>{text}</>;
  const parts = text.split(new RegExp(`(${word})`, "i"));
  return (
    <>
      {parts[0]}
      <span className="font-bold text-red-600 dark:text-red-400">{parts[1]}</span>
      {parts[2]}
    </>
  );
};

export const DeleteCollectionModal: React.FC<DeleteCollectionModalProps> = ({
  isOpen,
  collectionName,
  isDeleting,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const deleteWords = ["삭제", "delete", "削除"];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("collections.deleteCollection")}
        </h3>
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            <span className="font-bold">{collectionName}</span>{" "}
            {highlightWord(t("collections.deleteConfirmation"), deleteWords)}
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">
              <span className="font-bold">⚠️ {t("common.warning")}: </span>
              {highlightWord(t("collections.deleteWarning"), ["삭제", "deleted", "削除"])}
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-white/[0.12]"
          >
            {t("common.cancel")}{" "}
            <span className="text-xs opacity-70">(ESC)</span>
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {t("common.delete")}{" "}
            <span className="text-xs opacity-70">(Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
