const STORAGE_KEY = 'aether_age_confirmed';

export function isAgeConfirmed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function confirmAge() {
  localStorage.setItem(STORAGE_KEY, 'true');
}
