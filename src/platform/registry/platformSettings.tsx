import { BgColorsOutlined, InfoCircleOutlined, ApiOutlined } from '@ant-design/icons';
import AppearanceSettings from '../../components/layout/settings/AppearanceSettings';
import AboutSettings from '../../components/layout/settings/AboutSettings';
import KcbpRuntimeSettings from '../../components/layout/settings/KcbpRuntimeSettings';
import type { PlatformSettingsSection } from './types';

export const PLATFORM_SETTINGS_SECTIONS: PlatformSettingsSection[] = [
    {
        key: 'appearance',
        label: '外观',
        icon: <BgColorsOutlined />,
        category: 'general',
        searchKeywords: ['主题', '深色', '紧凑', '行号', 'dark'],
        placement: 'main',
        Panel: AppearanceSettings,
    },
    {
        key: 'kcbp-runtime',
        label: 'KCBP',
        icon: <ApiOutlined />,
        category: 'core',
        searchKeywords: ['kcbp', '可执行', '工作目录', '启动参数'],
        placement: 'main',
        Panel: KcbpRuntimeSettings,
    },
    {
        key: 'about',
        label: '关于',
        icon: <InfoCircleOutlined />,
        category: 'general',
        searchKeywords: ['版本', 'GoldenAPI', 'about'],
        placement: 'footer',
        Panel: AboutSettings,
    },
];

export const DEFAULT_SETTINGS_SECTION_KEY = 'appearance';

export function getPlatformMainSettingsSections(): PlatformSettingsSection[] {
    return PLATFORM_SETTINGS_SECTIONS.filter((section) => section.placement === 'main');
}

export function getPlatformFooterSettingsSections(): PlatformSettingsSection[] {
    return PLATFORM_SETTINGS_SECTIONS.filter((section) => section.placement === 'footer');
}

export function findPlatformSettingsSection(key: string): PlatformSettingsSection | undefined {
    return PLATFORM_SETTINGS_SECTIONS.find((section) => section.key === key);
}
