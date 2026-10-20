const DEMO_FLAG = 'courier-demo';

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

export function enterDemo(): void {
  try {
    sessionStorage.setItem(DEMO_FLAG, '1');
  } catch {
    return;
  }
  window.location.replace('/dashboard');
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(DEMO_FLAG);
  } catch {
    return;
  }
  window.location.replace('/');
}
