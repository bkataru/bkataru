import { encodeHTML, flexLayout } from "./render.js";

/**
 * Card colors interface.
 */
export interface CardColors {
  titleColor?: string;
  textColor?: string;
  iconColor?: string;
  bgColor?: string | string[];
  borderColor?: string;
}

/**
 * Card constructor options.
 */
export interface CardOptions {
  width?: number;
  height?: number;
  borderRadius?: number;
  colors?: CardColors;
  title?: string;
  titlePrefixIcon?: string;
}

/**
 * Base Card class for SVG card rendering.
 */
export class Card {
  width: number;
  height: number;
  borderRadius: number;
  colors: CardColors;
  title: string;
  titlePrefixIcon?: string;

  hideBorder: boolean;
  hideTitle: boolean;
  css: string;
  paddingX: number;
  paddingY: number;
  animations: boolean;
  a11yTitle: string;
  a11yDesc: string;

  constructor({
    width = 100,
    height = 100,
    borderRadius = 4.5,
    colors = {},
    title = "",
    titlePrefixIcon,
  }: CardOptions = {}) {
    this.width = width;
    this.height = height;
    this.borderRadius = borderRadius;
    this.colors = colors;
    this.title = encodeHTML(title);
    this.titlePrefixIcon = titlePrefixIcon;

    this.hideBorder = false;
    this.hideTitle = false;
    this.css = "";
    this.paddingX = 25;
    this.paddingY = 35;
    this.animations = true;
    this.a11yTitle = "";
    this.a11yDesc = "";
  }

  /**
   * Disable animations on the card.
   */
  disableAnimations(): void {
    this.animations = false;
  }

  /**
   * Set accessibility labels.
   */
  setAccessibilityLabel(title: string, desc: string): void {
    this.a11yTitle = title;
    this.a11yDesc = desc;
  }

  /**
   * Set custom CSS for the card.
   */
  setCSS(value: string): void {
    this.css = value;
  }

  /**
   * Set whether to hide the border.
   */
  setHideBorder(value: boolean): void {
    this.hideBorder = value;
  }

  /**
   * Set whether to hide the title.
   */
  setHideTitle(value: boolean): void {
    this.hideTitle = value;
    if (value) {
      this.height -= 30;
    }
  }

  /**
   * Set the card title.
   */
  setTitle(text: string): void {
    this.title = encodeHTML(text);
  }

  /**
   * Render the card title.
   */
  renderTitle(): string {
    const titleText = `
      <text
        x="0"
        y="0"
        class="header"
        data-testid="header"
      >${this.title}</text>
    `;

    const prefixIcon = this.titlePrefixIcon
      ? `
      <svg
        class="icon"
        x="0"
        y="-13"
        viewBox="0 0 16 16"
        version="1.1"
        width="16"
        height="16"
      >
        ${this.titlePrefixIcon}
      </svg>
    `
      : "";

    return `
      <g
        data-testid="card-title"
        transform="translate(${this.paddingX}, ${this.paddingY})"
      >
        ${flexLayout({
          items: [prefixIcon, titleText].filter(Boolean),
          gap: 25,
        }).join("")}
      </g>
    `;
  }

  /**
   * Render gradient definitions if background is a gradient.
   */
  renderGradient(): string {
    if (!Array.isArray(this.colors.bgColor)) {
      return "";
    }

    const gradients = this.colors.bgColor.slice(1);
    const rotation = this.colors.bgColor[0];

    return `
      <defs>
        <linearGradient
          id="gradient"
          gradientTransform="rotate(${rotation})"
          gradientUnits="userSpaceOnUse"
        >
          ${gradients.map((grad, index) => {
            const offset = (index * 100) / (gradients.length - 1);
            return `<stop offset="${offset}%" stop-color="#${grad}" />`;
          }).join("")}
        </linearGradient>
      </defs>
    `;
  }

  /**
   * Get CSS animations.
   */
  getAnimations(): string {
    return `
      /* Animations */
      @keyframes scaleInAnimation {
        from {
          transform: translate(-5px, 5px) scale(0);
        }
        to {
          transform: translate(-5px, 5px) scale(1);
        }
      }
      @keyframes fadeInAnimation {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
  }

  /**
   * Render the complete card SVG.
   */
  render(body: string): string {
    const bgColor = Array.isArray(this.colors.bgColor)
      ? "url(#gradient)"
      : this.colors.bgColor || "#fffefe";

    return `
      <svg
        width="${this.width}"
        height="${this.height}"
        viewBox="0 0 ${this.width} ${this.height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="descId"
      >
        <title id="titleId">${this.a11yTitle}</title>
        <desc id="descId">${this.a11yDesc}</desc>
        <style>
          .header {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: ${this.colors.titleColor || "#2f80ed"};
            animation: fadeInAnimation 0.8s ease-in-out forwards;
          }
          @supports(-moz-appearance: auto) {
            /* Selector detects Firefox */
            .header { font-size: 15.5px; }
          }
          ${this.css}
          ${process.env.NODE_ENV === "test" ? "" : this.getAnimations()}
          ${this.animations ? "" : `* { animation-duration: 0s !important; animation-delay: 0s !important; }`}
        </style>

        ${this.renderGradient()}

        <rect
          data-testid="card-bg"
          x="0.5"
          y="0.5"
          rx="${this.borderRadius}"
          height="99%"
          stroke="${this.colors.borderColor || "#e4e2e2"}"
          width="${this.width - 1}"
          fill="${bgColor}"
          stroke-opacity="${this.hideBorder ? 0 : 1}"
        />

        ${this.hideTitle ? "" : this.renderTitle()}

        <g
          data-testid="main-card-body"
          transform="translate(0, ${this.hideTitle ? this.paddingX : this.paddingY + 20})"
        >
          ${body}
        </g>
      </svg>
    `;
  }
}

export default Card;
