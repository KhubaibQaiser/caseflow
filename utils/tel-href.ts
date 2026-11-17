// `tel:` takes digits and a leading +; the visible number keeps its formatting.
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
