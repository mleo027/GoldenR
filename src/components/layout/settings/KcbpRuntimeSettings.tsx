import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, Typography } from 'antd';
import { FileOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons';
import SettingsConfigPath from '../SettingsConfigPath';
import {
    buildKcbpRuntimeConfigFromFormValues,
    kcbpRuntimeConfigToFormValues,
    type KcbpRuntimeConfigFormValues,
} from '@/shared/kcbp/configForm';
import { KCBP_ENV_FILE } from '@/config/files';
import {
    getKcbpRuntimeConfig,
    pickKcbpRuntimeDirectory,
    pickKcbpRuntimeFile,
    saveKcbpRuntimeConfig,
} from '@/lib/kcbpRuntimeConfigClient';
import { Input, TextArea } from '../../../components/ui/primitives';

export default function KcbpRuntimeSettings() {
    const { message } = App.useApp();
    const [loaded, setLoaded] = useState(false);
    const [form] = Form.useForm<KcbpRuntimeConfigFormValues>();

    useEffect(() => {
        void (async () => {
            const config = await getKcbpRuntimeConfig();
            form.setFieldsValue(kcbpRuntimeConfigToFormValues(config));
            setLoaded(true);
        })();
    }, [form]);

    const handleSave = useCallback(async () => {
        const values = await form.validateFields();
        const saved = await saveKcbpRuntimeConfig(buildKcbpRuntimeConfigFromFormValues(values));
        form.setFieldsValue(kcbpRuntimeConfigToFormValues(saved));
        message.success('KCBP 配置已保存');
    }, [form, message]);

    const pickFile = useCallback(async () => {
        const current = form.getFieldValue('executable') as string | undefined;
        const result = await pickKcbpRuntimeFile(current);
        if (result.canceled || !result.path) return;
        form.setFieldValue('executable', result.path);
    }, [form]);

    const pickDirectory = useCallback(async () => {
        const current = form.getFieldValue('workingDir') as string | undefined;
        const result = await pickKcbpRuntimeDirectory(current);
        if (result.canceled || !result.path) return;
        form.setFieldValue('workingDir', result.path);
    }, [form]);

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                KCBP 运行时
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                配置本地 KCBP 进程的可执行文件、工作目录与启动参数
            </Typography.Paragraph>
            <SettingsConfigPath fileName={KCBP_ENV_FILE} label="KCBP 配置保存在" />

            <div className="settings-panel-group">
                <Form form={form} layout="vertical" className="settings-form" disabled={!loaded}>
                    <Form.Item
                        label="KCBP 可执行文件"
                        name="executable"
                        rules={[{ required: true, message: '请选择 KCBP 可执行文件' }]}
                    >
                        <Input
                            placeholder="kcbp.exe"
                            addonAfter={
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<FileOutlined />}
                                    onClick={() => void pickFile()}
                                />
                            }
                        />
                    </Form.Item>
                    <Form.Item
                        label="KCBP 工作目录"
                        name="workingDir"
                        rules={[{ required: true, message: '请选择 KCBP 工作目录' }]}
                    >
                        <Input
                            placeholder="KCBP 启动 cwd"
                            addonAfter={
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<FolderOpenOutlined />}
                                    onClick={() => void pickDirectory()}
                                />
                            }
                        />
                    </Form.Item>
                    <Form.Item label="KCBP 启动参数（每行一条）" name="argsText">
                        <TextArea rows={2} placeholder="可选，传给 KCBP 的参数" />
                    </Form.Item>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => void handleSave()}
                    >
                        保存配置
                    </Button>
                </Form>
            </div>
        </div>
    );
}
