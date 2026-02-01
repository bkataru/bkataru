/**
 * Retrieves number with suffix k (thousands) precise to given decimal places.
 *
 * @param num - The number to format.
 * @param precision - Optional number of decimal places.
 * @returns The formatted number string.
 */
export function kFormatter(num: number, precision?: number): string {
  const abs = Math.abs(num);
  const sign = Math.sign(num);

  if (typeof precision === "number" && !isNaN(precision)) {
    return (sign * (abs / 1000)).toFixed(precision) + "k";
  }

  if (abs < 1000) {
    return String(sign * abs);
  }

  return sign * parseFloat((abs / 1000).toFixed(1)) + "k";
}

/**
 * Clamp the given number between the given range.
 *
 * @param value - The number to clamp.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns The clamped number.
 */
export function clampValue(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(value, max));
}

/**
 * Split text over multiple lines based on the specified width.
 *
 * @param text - Text to split.
 * @param width - Line width in number of characters.
 * @param maxLines - Maximum number of lines.
 * @returns Array of lines.
 */
export function wrapTextMultiline(
  text: string,
  width: number = 59,
  maxLines: number = 3
): string[] {
  const encoded = encodeHTML(text);

  // Simple word wrap implementation
  const words = encoded.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  const result = lines.slice(0, maxLines);

  // Add "..." to the last line if the text exceeds maxLines
  if (lines.length > maxLines && result.length > 0) {
    result[result.length - 1] += "...";
  }

  return result.filter(Boolean);
}

/**
 * Encode string as HTML.
 *
 * @param str - String to encode.
 * @returns Encoded string.
 */
export function encodeHTML(str: string): string {
  // eslint-disable-next-line no-control-regex
  const backspaceRegex = new RegExp(String.fromCharCode(8), "gim");
  return str
    .replace(/[\u00A0-\u9999<>&](?!#)/gim, (i) => {
      return "&#" + i.charCodeAt(0) + ";";
    })
    .replace(backspaceRegex, "");
}

/**
 * Convert bytes to a human-readable string representation.
 *
 * @param bytes - The number of bytes to convert.
 * @returns The human-readable representation of bytes.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) {
    throw new Error("Bytes must be a non-negative number");
  }

  if (bytes === 0) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  const base = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(base));

  if (i >= sizes.length) {
    throw new Error("Bytes is too large to convert to a human-readable string");
  }

  return `${(bytes / Math.pow(base, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Parse string to array of strings.
 *
 * @param str - The string to parse.
 * @returns The array of strings.
 */
export function parseArray(str: string): string[] {
  if (!str) {
    return [];
  }
  return str.split(",");
}

/**
 * Returns boolean if value is either "true" or "false" else undefined.
 *
 * @param value - The value to parse.
 * @returns The parsed boolean or undefined.
 */
export function parseBoolean(value: string | boolean): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    } else if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
}

/**
 * Lowercase and trim string.
 *
 * @param name - String to lowercase and trim.
 * @returns Lowercased and trimmed string.
 */
export function lowercaseTrim(name: string): string {
  return name.toLowerCase().trim();
}
