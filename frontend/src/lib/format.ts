export const formatFileSize = (bytes: number) =>
  bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;

export const formatDateTime = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString(undefined, options);
