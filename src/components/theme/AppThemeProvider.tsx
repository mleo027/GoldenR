import { useEffect, useMemo, type ReactNode } from 'react';
import { ConfigProvider, App, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAppEnv } from '../../store/useAppEnv';

const LIGHT_PRIMARY = '#7C3AED';
const DARK_PRIMARY = '#FF7A45';

const LIGHT_COMPONENTS = {
    Tabs: {
        cardGutter: 4,
        itemColor: '#6b7280',
        itemActiveColor: LIGHT_PRIMARY,
        itemSelectedColor: LIGHT_PRIMARY,
        cardBg: '#ffffff',
        cardPadding: '4px 12px',
        cardHeight: 32,
    },
    Table: {
        headerBg: '#f5f3ff',
        headerColor: '#1f2937',
        cellPaddingBlock: 10,
        cellPaddingBlockSM: 8,
        borderColor: '#e9e5f5',
        stickyScrollBarBg: 'transparent',
        stickyScrollBarBorderRadius: 3,
    },
    Card: { boxShadow: 'none' },
    Input: {
        activeShadow: 'none',
        hoverBorderColor: '#c4b5fd',
        activeBorderColor: LIGHT_PRIMARY,
        paddingBlockSM: 3,
        paddingInlineSM: 8,
        borderRadius: 4,
    },
    Button: {
        primaryShadow: 'none',
        borderRadius: 4,
    },
    Checkbox: {
        colorPrimary: LIGHT_PRIMARY,
        colorBorder: '#e9e5f5',
    },
    Pagination: {
        itemActiveBg: LIGHT_PRIMARY,
        itemActiveColor: '#ffffff',
        itemSize: 28,
    },
    Modal: {
        borderRadiusLG: 8,
        centered: true,
    },
    Message: {
        contentBg: '#ffffff',
        colorText: '#374151',
    },
    Notification: {
        colorBgElevated: '#ffffff',
    },
};

const DARK_COMPONENTS = {
    Tabs: {
        cardGutter: 4,
        itemColor: '#888899',
        itemActiveColor: DARK_PRIMARY,
        itemSelectedColor: DARK_PRIMARY,
        cardBg: '#111111',
        cardPadding: '4px 12px',
        cardHeight: 32,
    },
    Table: {
        headerBg: '#141414',
        headerColor: '#e6e6ef',
        cellPaddingBlock: 10,
        cellPaddingBlockSM: 8,
        borderColor: '#262626',
        rowHoverBg: '#1a1a1a',
        stickyScrollBarBg: 'transparent',
        stickyScrollBarBorderRadius: 3,
    },
    Card: { boxShadow: 'none' },
    Input: {
        activeShadow: 'none',
        hoverBorderColor: '#3f3f3f',
        activeBorderColor: DARK_PRIMARY,
        paddingBlockSM: 3,
        paddingInlineSM: 8,
        borderRadius: 4,
        colorBgContainer: '#0a0a0a',
    },
    Button: {
        primaryShadow: 'none',
        borderRadius: 4,
        defaultBg: '#141414',
        defaultBorderColor: '#262626',
        defaultColor: '#d4d4dc',
    },
    Checkbox: {
        colorPrimary: DARK_PRIMARY,
        colorBorder: '#3f3f3f',
    },
    Pagination: {
        itemActiveBg: DARK_PRIMARY,
        itemActiveColor: '#ffffff',
        colorBgContainer: '#1a1a1a',
        colorBorder: '#3a3a3a',
        itemSize: 28,
    },
    Modal: {
        borderRadiusLG: 8,
        centered: true,
        contentBg: '#111111',
        headerBg: '#111111',
        titleColor: '#f5f5f5',
    },
    Dropdown: {
        colorBgElevated: '#1a1a1a',
    },
    Tooltip: {
        colorBgSpotlight: '#1a1a1a',
    },
    Message: {
        contentBg: '#1a1a1a',
        colorText: '#f5f5f5',
    },
    Notification: {
        colorBgElevated: '#1a1a1a',
    },
};

export default function AppThemeProvider({ children }: { children: ReactNode }) {
    const { env, loaded } = useAppEnv();
    const isDark = env.darkMode;
    const accentColor = env.accentColor || (isDark ? DARK_PRIMARY : LIGHT_PRIMARY);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = isDark ? 'dark' : 'light';
        root.style.colorScheme = isDark ? 'dark' : 'light';
        root.style.setProperty('--color-primary', accentColor);
        root.style.setProperty('--color-text-accent', accentColor);
        root.style.setProperty(
            '--color-primary-hover',
            'color-mix(in srgb, var(--color-primary) 82%, black)',
        );
        root.style.setProperty(
            '--color-primary-subtle',
            'color-mix(in srgb, var(--color-primary) 8%, transparent)',
        );
        root.style.setProperty(
            '--color-primary-muted',
            'color-mix(in srgb, var(--color-primary) 16%, transparent)',
        );
        root.style.setProperty(
            '--color-primary-glow',
            'color-mix(in srgb, var(--color-primary) 18%, transparent)',
        );
        return () => {
            delete root.dataset.theme;
            root.style.removeProperty('color-scheme');
            root.style.removeProperty('--color-primary');
            root.style.removeProperty('--color-text-accent');
            root.style.removeProperty('--color-primary-hover');
            root.style.removeProperty('--color-primary-subtle');
            root.style.removeProperty('--color-primary-muted');
            root.style.removeProperty('--color-primary-glow');
        };
    }, [accentColor, isDark]);

    const antdTheme = useMemo(
        () => ({
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
                colorPrimary: accentColor,
                colorBgContainer: isDark ? '#111111' : '#ffffff',
                colorBgElevated: isDark ? '#1a1a1a' : '#ffffff',
                colorBgLayout: isDark ? '#141414' : '#f3f6fb',
                colorBorder: isDark ? '#333333' : '#dce3ec',
                colorText: isDark ? '#f0f0f0' : '#344054',
                colorTextSecondary: isDark ? '#a5a5b0' : '#667085',
                colorTextPlaceholder: isDark ? '#858585' : '#98a2b3',
                borderRadius: 6,
                fontSize: 13,
                controlHeight: 32,
                lineWidth: 1,
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            },
            components: {
                ...(isDark ? DARK_COMPONENTS : LIGHT_COMPONENTS),
                Tabs: {
                    ...(isDark ? DARK_COMPONENTS.Tabs : LIGHT_COMPONENTS.Tabs),
                    cardBg: isDark ? '#111111' : '#ffffff',
                    itemActiveColor: accentColor,
                    itemSelectedColor: accentColor,
                },
                Input: {
                    ...(isDark ? DARK_COMPONENTS.Input : LIGHT_COMPONENTS.Input),
                    activeBorderColor: accentColor,
                    hoverBorderColor: accentColor,
                },
                Checkbox: {
                    ...(isDark ? DARK_COMPONENTS.Checkbox : LIGHT_COMPONENTS.Checkbox),
                    colorPrimary: accentColor,
                },
                Pagination: {
                    ...(isDark ? DARK_COMPONENTS.Pagination : LIGHT_COMPONENTS.Pagination),
                    itemActiveBg: accentColor,
                },
                Table: {
                    ...(isDark ? DARK_COMPONENTS.Table : LIGHT_COMPONENTS.Table),
                    headerBg: isDark
                        ? '#141414'
                        : 'color-mix(in srgb, var(--color-primary) 8%, white)',
                },
            },
        }),
        [accentColor, isDark],
    );

    if (!loaded) {
        return null;
    }

    return (
        <ConfigProvider
            locale={zhCN}
            wave={{ disabled: true }}
            theme={antdTheme}
            getPopupContainer={() => document.body}
        >
            <App message={{ maxCount: 3, duration: 3 }} style={{ height: '100%', width: '100%' }}>
                {children}
            </App>
        </ConfigProvider>
    );
}
