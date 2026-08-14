import { useId } from 'react';

interface GoldenApiLogoProps {
    size?: number;
    className?: string;
    title?: string;
}

/** 内联矢量 Logo，任意尺寸下保持清晰（优于 img 缩放 raster SVG） */
export default function GoldenApiLogo({
    size = 56,
    className,
    title = 'GoldenAPI',
}: GoldenApiLogoProps) {
    const uid = useId().replace(/:/g, '');
    const bg = `ga-bg-${uid}`;
    const gold = `ga-gold-${uid}`;
    const goldShine = `ga-gold-shine-${uid}`;
    const glare = `ga-glare-${uid}`;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="none"
            width={size}
            height={size}
            shapeRendering="geometricPrecision"
            className={className}
            role="img"
            aria-label={title}
        >
            <defs>
                <linearGradient
                    id={bg}
                    x1="72"
                    y1="56"
                    x2="440"
                    y2="456"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#7C3AED" />
                    <stop offset="0.52" stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#6366F1" />
                </linearGradient>
                <linearGradient
                    id={gold}
                    x1="362"
                    y1="88"
                    x2="418"
                    y2="144"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#FDE68A" />
                    <stop offset="1" stopColor="#F59E0B" />
                </linearGradient>
                <linearGradient
                    id={goldShine}
                    x1="378"
                    y1="96"
                    x2="402"
                    y2="120"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                    id={glare}
                    x1="96"
                    y1="72"
                    x2="220"
                    y2="196"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill={`url(#${bg})`} />
            <path
                d="M112 112C112 112 168 88 224 112C168 136 136 168 112 224C88 168 112 112 112 112Z"
                fill={`url(#${glare})`}
            />
            <circle cx="392" cy="120" r="30" fill={`url(#${gold})`} />
            <circle cx="384" cy="112" r="10" fill={`url(#${goldShine})`} />
            <path
                fill="#FFFFFF"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M256 172C206.294 172 166 212.294 166 262C166 311.706 206.294 352 256 352C293.137 352 325.412 330.627 340.588 298H308.588C297.647 315.451 278.118 326 256 326C221.072 326 192 296.928 192 262C192 227.072 221.072 198 256 198C278.118 198 297.647 208.549 308.588 226H340.588C325.412 193.373 293.137 172 256 172ZM264 262H346V238H264V262Z"
            />
            <path
                d="M136 346H196M316 346H376"
                stroke="#FFFFFF"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.38"
            />
            <path
                d="M120 346V326M212 346V366M300 346V326M392 346V366"
                stroke="#FFFFFF"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.38"
            />
        </svg>
    );
}
