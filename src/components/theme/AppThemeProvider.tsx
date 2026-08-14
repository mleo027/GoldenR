import { useMemo, type ReactNode } from 'react';
import { ConfigProvider, App, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAppEnv } from '../../store/useAppEnv';

const LIGHT_PRIMARY = '#7C3AED';
const DARK_PRIMARY = '#2DA44E';

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

    const antdTheme = useMemo(
        () => ({
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
                colorPrimary: isDark ? DARK_PRIMARY : LIGHT_PRIMARY,
                colorBgContainer: isDark ? '#111111' : '#ffffff',
                colorBgElevated: isDark ? '#1a1a1a' : '#ffffff',
                colorBgLayout: isDark ? '#0a0a0a' : '#f5f6f8',
                colorBorder: isDark ? '#262626' : '#ececec',
                colorText: isDark ? '#e6e6ef' : '#374151',
                colorTextSecondary: isDark ? '#888899' : '#6b7280',
                colorTextPlaceholder: isDark ? '#737373' : '#9ca3af',
                borderRadius: 4,
                lineWidth: 1,
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            },
            components: isDark ? DARK_COMPONENTS : LIGHT_COMPONENTS,
        }),
        [isDark],
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
