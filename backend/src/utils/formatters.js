import crypto from 'crypto';

export function normalizeMobile(rawMobile) {
  const clean = (rawMobile || '').toString().trim();
  let digits = clean.replace(/\D/g, '');

  while (digits.length > 10) {
    if (digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
      digits = digits.slice(1);
    } else {
      break;
    }
  }

  const normalized = digits.length === 10 ? digits : clean;
  const variants = Array.from(
    new Set([normalized, `+91${normalized}`, `91${normalized}`, clean].filter(Boolean))
  );

  return {
    mobile: normalized,
    variants,
  };
}

export function cleanRate(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0.0 : Math.round(num * 100) / 100;
}

export function cleanGrams(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0.0 : Math.round(num * 10000) / 10000;
}

export function generateTransactionId(prefix = 'TXN') {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix.toUpperCase()}-${dateStr}-${randomHex}`;
}

export function getEndOfDayExpiryUTC() {
  // 23:59:59 in Asia/Kolkata (UTC+5:30)
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayIST = istFormatter.format(now);
  const endOfDayIST = new Date(`${todayIST}T23:59:59.999+05:30`);
  return endOfDayIST;
}

export default {
  normalizeMobile,
  cleanRate,
  cleanGrams,
  generateTransactionId,
  getEndOfDayExpiryUTC,
};
