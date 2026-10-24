export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' ₫';
export const shortMoney = (n: number) =>
  n >= 1e9
    ? `${+(n / 1e9).toFixed(1)} tỷ`
    : n >= 1e6
      ? `${+(n / 1e6).toFixed(1)} tr`
      : n >= 1000
        ? `${+(n / 1000).toFixed(0)}k`
        : String(n);
export const dateText = (s: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(s.length === 10 ? s + 'T12:00:00+07:00' : s));
export const initials = (s: string) =>
  s
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
