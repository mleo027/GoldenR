interface GoldenApiLogoProps {
    size?: number;
    className?: string;
    title?: string;
}

const logoUrl = `${import.meta.env.BASE_URL}goldenapi.svg`;

export default function GoldenApiLogo({
    size = 56,
    className,
    title = 'GoldenAPI',
}: GoldenApiLogoProps) {
    return (
        <img
            src={logoUrl}
            width={size}
            height={size}
            className={className}
            alt={title}
            draggable={false}
        />
    );
}
