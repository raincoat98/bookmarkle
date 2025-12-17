async function loadOnce(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-include]"));
  if (!nodes.length) return false;

  await Promise.all(
    nodes.map(async (node) => {
      const src = node.getAttribute("data-include");
      if (!src) return;

      // 보안: 상대 경로만 허용 (../ 같은 경로 탐색 방지)
      if (
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("//")
      ) {
        console.error("⚠️ External URLs not allowed in data-include:", src);
        node.outerHTML = "";
        return;
      }

      // 보안: 상대 경로 검증 (./로 시작하거나 상대 경로만 허용)
      if (!src.startsWith("./") && !src.startsWith("../")) {
        // 상대 경로가 아니면 ./를 추가
        const normalizedSrc = src.startsWith("/") ? `.${src}` : `./${src}`;
        try {
          const response = await fetch(normalizedSrc);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const html = await response.text();
          node.outerHTML = html;
        } catch (error) {
          console.error(`Failed to include fragment: ${normalizedSrc}`, error);
          node.outerHTML = "";
        }
        return;
      }

      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        node.outerHTML = html;
      } catch (error) {
        console.error(`Failed to include fragment: ${src}`, error);
        node.outerHTML = "";
      }
    })
  );

  return true;
}

export async function includeHTML(root = document) {
  // Process until no include directives remain (allows nested fragments).
  while (await loadOnce(root)) {
    // loop
  }
}
