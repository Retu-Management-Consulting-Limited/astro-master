// Minimal counting semaphore. Used to cap concurrent Agent-SDK subprocesses on
// the local subscription path (P1-3): each call cold-starts a subprocess, so an
// unbounded burst (e.g. a rate-limit test) can exhaust the dev server. Production
// uses the API path and is unaffected.
export function createSemaphore(max: number) {
  let active = 0;
  const waiters: Array<() => void> = [];

  function release() {
    active--;
    const next = waiters.shift();
    if (next) next();
  }

  function acquire(): Promise<void> {
    if (active < max) {
      active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      waiters.push(() => {
        active++;
        resolve();
      });
    });
  }

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  return { run };
}
