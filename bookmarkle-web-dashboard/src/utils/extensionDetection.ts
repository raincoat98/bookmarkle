const DETECTION_PING = "EXTENSION_DETECTION_PING";
const DETECTION_PONG = "EXTENSION_DETECTION_PONG";
const DETECTION_TIMEOUT_MS = 1500;

let cachedResult: boolean | null = null;
let detectionPromise: Promise<boolean> | null = null;

const isBrowser = typeof window !== "undefined";

function runDetection(): Promise<boolean> {
  if (!isBrowser) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.origin) return;
      const data = event.data;
      if (data?.source !== "bookmarkhub") return;
      if (data.type !== DETECTION_PONG) return;

      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    };

    window.addEventListener("message", handleMessage);

    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, DETECTION_TIMEOUT_MS);

    window.postMessage(
      {
        source: "bookmarkhub",
        type: DETECTION_PING,
      },
      window.origin
    );
  });
}

/**
 * Extension 설치 여부를 감지한다. 최초 성공 결과는 캐시된다.
 */
export function detectExtensionPresence(): Promise<boolean> {
  if (!isBrowser) {
    return Promise.resolve(false);
  }

  if (cachedResult !== null) {
    return Promise.resolve(cachedResult);
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = runDetection().then((result) => {
    cachedResult = result;
    detectionPromise = null;
    return result;
  });

  return detectionPromise;
}

/**
 * 캐시된 감지 결과를 즉시 반환한다. 아직 감지하지 않았다면 false.
 */
export function getCachedExtensionPresence() {
  return cachedResult === true;
}

/**
 * 감지를 수행한 적이 있는지 여부를 반환한다.
 */
export function hasCachedExtensionDetection() {
  return cachedResult !== null;
}
