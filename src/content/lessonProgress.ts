type StoragePort = Pick<Storage, "getItem" | "setItem">;

const MOTION_LESSON_KEY = "physicslab.lesson.motion-01";

function getBrowserStorage(): StoragePort | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function isMotionLessonComplete(storage = getBrowserStorage()): boolean {
  try {
    return storage?.getItem(MOTION_LESSON_KEY) === "complete";
  } catch {
    return false;
  }
}

export function persistMotionLessonCompletion(storage = getBrowserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(MOTION_LESSON_KEY, "complete");
    return true;
  } catch {
    return false;
  }
}
