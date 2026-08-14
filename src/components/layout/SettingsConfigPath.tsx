import { Typography } from 'antd';
import { joinUserDataFile, useUserDataDir } from '../../hooks/useUserDataDir';

interface SettingsConfigPathProps {
    fileName: string;
    label?: string;
}

/** 设置页：展示 userData 下配置文件的绝对路径 */
export default function SettingsConfigPath({
    fileName,
    label = '配置文件',
}: SettingsConfigPathProps) {
    const userDataDir = useUserDataDir();
    const absPath = joinUserDataFile(userDataDir, fileName);

    if (!absPath) return null;

    return (
        <Typography.Paragraph className="settings-form-meta" copyable={{ text: absPath }}>
            {label}：<span title={absPath}>{absPath}</span>
        </Typography.Paragraph>
    );
}
