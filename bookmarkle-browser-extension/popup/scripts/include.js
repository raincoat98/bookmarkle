async function loadOnce(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-include]"));
  if (!nodes.length) return false;

  await Promise.all(
    nodes.map(async (node) => {
      const src = node.getAttribute("data-include");
      if (!src) return;
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
