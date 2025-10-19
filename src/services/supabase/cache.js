const cacheStore = new Map();

const getTimestamp = () => Date.now();

export const getCachedOrFetch = async (key, fetcher, ttl = 60_000) => {
  const now = getTimestamp();
  const existing = cacheStore.get(key);

  if (existing && existing.expiry > now) {
    if (existing.promise) {
      return existing.promise;
    }
    return existing.value;
  }

  const fetchPromise = Promise.resolve()
    .then(fetcher)
    .then((result) => {
      cacheStore.set(key, {
        value: result,
        expiry: now + ttl,
      });
      return result;
    })
    .catch((error) => {
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    promise: fetchPromise,
    value: existing?.value,
    expiry: now + ttl,
  });

  return fetchPromise;
};

export const invalidateCache = (keyPrefix) => {
  cacheStore.forEach((_, key) => {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key);
    }
  });
};
