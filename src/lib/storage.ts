const getStorageKey = (key: string) => `doctor-calendar-${key}`;

export const saveToLocalStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

export const loadFromLocalStorage = <T,>(key: string): T | null => {
  try {
    const data = localStorage.getItem(getStorageKey(key));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return null;
  }
};

export const clearLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(getStorageKey(key));
  } catch (error) {
    console.error(`Error clearing ${key} from localStorage:`, error);
  }
};