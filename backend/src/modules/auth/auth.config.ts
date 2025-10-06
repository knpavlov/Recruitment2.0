const RAW_FLAG = process.env.AUTH_DISABLE_EMAIL_LOGIN?.trim().toLowerCase();

export const AUTH_EMAIL_LOGIN_DISABLED = RAW_FLAG === '1' || RAW_FLAG === 'true';

// Оставляем отдельную функцию для наглядной подмены в тестах
export const isEmailLoginDisabled = () => AUTH_EMAIL_LOGIN_DISABLED;
