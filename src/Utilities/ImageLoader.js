export function loadImages(imageMap) {
  const result = {};
  const promises = [];

  for (const groupKey in imageMap) {
    result[groupKey] = {};

    for (const imageKey in imageMap[groupKey]) {
      const src = imageMap[groupKey][imageKey];
      const img = new Image();

      result[groupKey][imageKey] = img;

      const promise = new Promise(resolve => {
        img.onload = () => {
          console.log("Loaded:", src);
          resolve();
        };

        img.onerror = () => {
          console.warn("Failed to load:", src);
          resolve(); // never block startup
        };
      });

      img.src = src;

      promises.push(promise);
    }
  }

  return Promise.all(promises).then(() => result);
}
