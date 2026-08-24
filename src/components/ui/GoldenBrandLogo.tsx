interface GoldenBrandLogoProps {
    className?: string;
    title?: string;
}

/** 标题栏品牌标识：Golden 文字，背景跟随主题强调色。 */
export default function GoldenBrandLogo({ className, title = 'Golden' }: GoldenBrandLogoProps) {
    return (
        <div className={`golden-brand-logo${className ? ` ${className}` : ''}`} aria-label={title}>
            <span className="golden-brand-logo-text">Golden</span>
        </div>
    );
}
