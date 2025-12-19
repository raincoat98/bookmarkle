import type { Bookmark, Collection } from "../types";

/**
 * Chrome 북마크 HTML 형식으로 내보내기
 * Netscape Bookmark File Format을 따름
 */
export const exportToChromeBookmarks = (
  bookmarks: Bookmark[],
  collections: Collection[]
): string => {
  // 컬렉션을 맵으로 변환 (빠른 조회를 위해)
  const collectionMap = new Map<string, Collection>();
  collections.forEach((col) => {
    collectionMap.set(col.id, col);
  });

  // 컬렉션별로 북마크 그룹화
  const bookmarksByCollection = new Map<string | null, Bookmark[]>();
  bookmarks.forEach((bookmark) => {
    const collectionId = bookmark.collection || null;
    if (!bookmarksByCollection.has(collectionId)) {
      bookmarksByCollection.set(collectionId, []);
    }
    bookmarksByCollection.get(collectionId)!.push(bookmark);
  });

  // HTML 헤더
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // 컬렉션이 없는 북마크 먼저 추가
  const noCollectionBookmarks = bookmarksByCollection.get(null) || [];
  noCollectionBookmarks.forEach((bookmark) => {
    const addDate = Math.floor(
      (bookmark.createdAt?.getTime() || Date.now()) / 1000
    );
    const href = escapeHtml(bookmark.url);
    const title = escapeHtml(bookmark.title);
    html += `    <DT><A HREF="${href}" ADD_DATE="${addDate}">${title}</A>\n`;
  });

  // 컬렉션별로 북마크 추가
  collections.forEach((collection) => {
    const collectionBookmarks = bookmarksByCollection.get(collection.id) || [];
    if (collectionBookmarks.length === 0) return;

    const addDate = Math.floor(
      (collection.createdAt?.getTime() || Date.now()) / 1000
    );
    const folderName = escapeHtml(collection.name);
    html += `    <DT><H3 ADD_DATE="${addDate}">${folderName}</H3>\n`;
    html += `    <DL><p>\n`;

    collectionBookmarks.forEach((bookmark) => {
      const bookmarkAddDate = Math.floor(
        (bookmark.createdAt?.getTime() || Date.now()) / 1000
      );
      const href = escapeHtml(bookmark.url);
      const title = escapeHtml(bookmark.title);
      html += `        <DT><A HREF="${href}" ADD_DATE="${bookmarkAddDate}">${title}</A>\n`;
    });

    html += `    </DL><p>\n`;
  });

  html += `</DL><p>`;

  return html;
};

/**
 * Chrome 북마크 HTML 파일을 파싱하여 북마크와 컬렉션 추출
 */
export interface ParsedChromeBookmark {
  title: string;
  url: string;
  addDate?: number;
  folder?: string;
}

export const parseChromeBookmarks = (
  html: string
): {
  bookmarks: ParsedChromeBookmark[];
  collections: string[];
} => {
  const bookmarks: ParsedChromeBookmark[] = [];
  const collections = new Set<string>();

  // HTML 파싱을 위한 임시 DOM 생성
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 재귀적으로 DOM 트리 순회
  const processNode = (node: Node, currentFolder?: string): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toUpperCase();

      // 폴더 (H3 태그) 처리
      if (tagName === "H3") {
        const folderName = element.textContent?.trim() || "";
        if (folderName) {
          collections.add(folderName);
        }

        // 다음 형제 노드 중 DL 태그 찾기
        let nextSibling = element.nextElementSibling;
        while (nextSibling) {
          if (nextSibling.tagName.toUpperCase() === "DL") {
            // 폴더 내부 처리
            processNode(nextSibling, folderName);
            break;
          }
          nextSibling = nextSibling.nextElementSibling;
        }
      }

      // 링크 (A 태그) 처리
      if (tagName === "A") {
        const href = element.getAttribute("HREF");
        const title = element.textContent?.trim();
        const addDate = element.getAttribute("ADD_DATE");

        if (href && title) {
          bookmarks.push({
            title,
            url: href,
            addDate: addDate ? parseInt(addDate, 10) : undefined,
            folder: currentFolder,
          });
        }
      }

      // 자식 노드 처리 (DL 태그 내부)
      if (tagName === "DL" || tagName === "DT") {
        for (let i = 0; i < element.childNodes.length; i++) {
          processNode(element.childNodes[i], currentFolder);
        }
      }
    }
  };

  // 루트 DL 태그 찾기
  const rootDL = doc.querySelector("DL");
  if (rootDL) {
    processNode(rootDL);
  } else {
    // DL 태그가 없으면 전체 문서에서 찾기
    processNode(doc.body || doc.documentElement);
  }

  return {
    bookmarks,
    collections: Array.from(collections),
  };
};

/**
 * Chrome 북마크 데이터를 Bookmark 및 Collection 형식으로 변환
 */
export const convertChromeBookmarksToAppFormat = (
  parsed: {
    bookmarks: ParsedChromeBookmark[];
    collections: string[];
  },
  userId: string
): {
  bookmarks: Omit<Bookmark, "id">[];
  collections: Omit<Collection, "id">[];
} => {
  // 컬렉션 맵 생성 (이름 -> ID)
  const collectionNameToId = new Map<string, string>();
  const collections: Omit<Collection, "id">[] = [];

  parsed.collections.forEach((name, index) => {
    const collectionId = `collection_${index}_${Date.now()}`;
    collectionNameToId.set(name, collectionId);
    collections.push({
      name,
      description: "",
      icon: "📁",
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: null,
      isPinned: false,
    });
  });

  // 북마크 변환
  const bookmarks: Omit<Bookmark, "id">[] = parsed.bookmarks.map(
    (chromeBookmark) => {
      const addDate = chromeBookmark.addDate
        ? new Date(chromeBookmark.addDate * 1000)
        : new Date();

      return {
        title: chromeBookmark.title,
        url: chromeBookmark.url,
        description: "",
        favicon: "",
        collection: chromeBookmark.folder
          ? collectionNameToId.get(chromeBookmark.folder) || null
          : null,
        order: 0,
        userId,
        createdAt: addDate,
        updatedAt: addDate,
        tags: [],
        isFavorite: false,
        deletedAt: null,
      };
    }
  );

  return { bookmarks, collections };
};

/**
 * HTML 특수 문자 이스케이프
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Chrome 북마크 HTML 파일 다운로드
 */
export const downloadChromeBookmarks = (
  bookmarks: Bookmark[],
  collections: Collection[]
): void => {
  const html = exportToChromeBookmarks(bookmarks, collections);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bookmarks-${new Date().toISOString().split("T")[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
