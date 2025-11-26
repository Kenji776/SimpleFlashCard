export const now = () => performance?.now?.() || Date.now();
