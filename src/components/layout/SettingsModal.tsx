import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Modal } from 'antd';
import { SettingOutlined, SearchOutlined } from '@ant-design/icons';
import SettingsNavHighlight from './SettingsNavHighlight';
import { useAppEnv } from '../../store/useAppEnv';
import {
    DEFAULT_SETTINGS_SECTION_KEY,
    findPlatformSettingsSection,
    getPlatformFooterSettingsSections,
    getPlatformMainSettingsSections,
} from '../../platform/registry/platformSettings';
import { getVisibleModuleSettingsSections } from '../../platform/registry/settings';
import {
    buildSettingsNavGroups,
    filterSettingsNavGroups,
    matchesSettingsSearch,
    toSettingsNavItem,
} from './settingsNav';
import { Input } from '../ui/primitives';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
    initialSectionKey?: string;
}

type SettingsSectionKey = string;

function SettingsModalNav({
    filteredNavGroups,
    filteredFooterSections,
    searchQuery,
    hasSearchQuery,
    activeSection,
    onSearchChange,
    onSectionSelect,
}: {
    filteredNavGroups: ReturnType<typeof filterSettingsNavGroups>;
    filteredFooterSections: ReturnType<typeof getPlatformFooterSettingsSections>;
    searchQuery: string;
    hasSearchQuery: boolean;
    activeSection: string;
    onSearchChange: (value: string) => void;
    onSectionSelect: (key: string) => void;
}) {
    return (
        <nav className="settings-modal-nav" aria-label="设置导航">
            <div className="settings-modal-nav-search">
                <Input
                    allowClear
                    size="sm"
                    prefix={<SearchOutlined className="settings-modal-search-icon" />}
                    placeholder="搜索设置…"
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    aria-label="搜索设置"
                />
            </div>

            <div className="settings-modal-nav-body ui-scroll">
                {filteredNavGroups.length === 0 && filteredFooterSections.length === 0 ? (
                    <div className="settings-modal-nav-empty">未找到匹配的设置项</div>
                ) : (
                    filteredNavGroups.map((group) => (
                        <div key={group.key} className="settings-modal-nav-group">
                            <div className="settings-modal-nav-group-label">{group.label}</div>
                            {group.items.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`settings-modal-nav-item${activeSection === item.key ? ' settings-modal-nav-item-active' : ''}`}
                                    onClick={() => onSectionSelect(item.key)}
                                >
                                    <span className="settings-modal-nav-icon">{item.icon}</span>
                                    {hasSearchQuery ? (
                                        <SettingsNavHighlight
                                            text={item.label}
                                            query={searchQuery}
                                        />
                                    ) : (
                                        item.label
                                    )}
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {filteredFooterSections.length > 0 ? (
                <div className="settings-modal-nav-footer">
                    {filteredFooterSections.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            className={`settings-modal-nav-item${activeSection === section.key ? ' settings-modal-nav-item-active' : ''}`}
                            onClick={() => onSectionSelect(section.key)}
                        >
                            <span className="settings-modal-nav-icon">{section.icon}</span>
                            {hasSearchQuery ? (
                                <SettingsNavHighlight text={section.label} query={searchQuery} />
                            ) : (
                                section.label
                            )}
                        </button>
                    ))}
                </div>
            ) : null}
        </nav>
    );
}

function SettingsModalContent({
    showSearchEmpty,
    searchQuery,
    ActivePanel,
    isWidePanel,
}: {
    showSearchEmpty: boolean;
    searchQuery: string;
    ActivePanel?: ComponentType;
    isWidePanel: boolean;
}) {
    return (
        <div className="settings-modal-content ui-scroll">
            <div
                className={`settings-modal-content-inner${isWidePanel ? ' settings-modal-content-inner-wide' : ''}`}
            >
                {showSearchEmpty ? (
                    <div className="settings-modal-search-empty">
                        未找到与「{searchQuery.trim()}」匹配的设置项
                    </div>
                ) : ActivePanel ? (
                    <ActivePanel />
                ) : null}
            </div>
        </div>
    );
}

export default function SettingsModal({ open, onClose, initialSectionKey }: SettingsModalProps) {
    const { env } = useAppEnv();
    const [activeSection, setActiveSection] = useState<SettingsSectionKey>(
        initialSectionKey ?? DEFAULT_SETTINGS_SECTION_KEY,
    );
    const [searchQuery, setSearchQuery] = useState('');

    const platformMainSections = useMemo(() => getPlatformMainSettingsSections(), []);
    const platformFooterSections = useMemo(() => getPlatformFooterSettingsSections(), []);

    const moduleSections = useMemo(
        () => getVisibleModuleSettingsSections(env.activeModuleId),
        [env.activeModuleId],
    );

    const navGroups = useMemo(
        () => buildSettingsNavGroups(platformMainSections, moduleSections),
        [moduleSections, platformMainSections],
    );

    const filteredNavGroups = useMemo(
        () => filterSettingsNavGroups(navGroups, searchQuery),
        [navGroups, searchQuery],
    );

    const filteredFooterSections = useMemo(
        () =>
            platformFooterSections.filter((section) =>
                matchesSettingsSearch(toSettingsNavItem(section), searchQuery),
            ),
        [platformFooterSections, searchQuery],
    );

    const visibleNavKeys = useMemo(
        () => [
            ...filteredNavGroups.flatMap((group) => group.items.map((item) => item.key)),
            ...filteredFooterSections.map((section) => section.key),
        ],
        [filteredFooterSections, filteredNavGroups],
    );

    const hasSearchQuery = searchQuery.trim().length > 0;
    const hasVisibleNav = visibleNavKeys.length > 0;
    const showSearchEmpty = hasSearchQuery && !hasVisibleNav;

    const navItemKeys = useMemo(
        () => [
            ...navGroups.flatMap((group) => group.items.map((item) => item.key)),
            ...platformFooterSections.map((section) => section.key),
        ],
        [navGroups, platformFooterSections],
    );

    useEffect(() => {
        if (!open) {
            setSearchQuery('');
            return;
        }
        if (initialSectionKey && navItemKeys.includes(initialSectionKey)) {
            setActiveSection(initialSectionKey);
        }
        if (!navItemKeys.includes(activeSection)) {
            setActiveSection(initialSectionKey ?? DEFAULT_SETTINGS_SECTION_KEY);
            return;
        }
        if (hasSearchQuery && hasVisibleNav && !visibleNavKeys.includes(activeSection)) {
            setActiveSection(visibleNavKeys[0]);
        }
    }, [activeSection, hasSearchQuery, hasVisibleNav, initialSectionKey, navItemKeys, open, visibleNavKeys]);

    const activePlatformSection = findPlatformSettingsSection(activeSection);
    const activeModuleSection = moduleSections.find((section) => section.key === activeSection);
    const ActivePanel = activePlatformSection?.Panel ?? activeModuleSection?.Panel;
    const isWidePanel = activeModuleSection?.layout === 'wide';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={1024}
            wrapClassName="settings-modal-wrap"
            destroyOnHidden
            className="app-modal settings-modal"
            title={
                <span className="settings-modal-title">
                    <SettingOutlined className="settings-modal-title-icon" />
                    设置
                </span>
            }
        >
            <div className="settings-modal-layout">
                <SettingsModalNav
                    filteredNavGroups={filteredNavGroups}
                    filteredFooterSections={filteredFooterSections}
                    searchQuery={searchQuery}
                    hasSearchQuery={hasSearchQuery}
                    activeSection={activeSection}
                    onSearchChange={setSearchQuery}
                    onSectionSelect={setActiveSection}
                />
                <SettingsModalContent
                    showSearchEmpty={showSearchEmpty}
                    searchQuery={searchQuery}
                    ActivePanel={ActivePanel}
                    isWidePanel={isWidePanel}
                />
            </div>
        </Modal>
    );
}
