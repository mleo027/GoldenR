import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Switch, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import SettingsConfigPath from '../../../../components/layout/SettingsConfigPath';
import type { DbConnectionConfig } from '../../types/paramSuggest';
import { DB_CONFIG_FILE, DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';
import { testDbConnection } from '../../services/paramSuggestService';
import { useParamSuggest } from '../../store/useParamSuggest';

function buildDbConfig(values: DbConnectionConfig): DbConnectionConfig {
    return {
        ...DEFAULT_DB_CONFIG,
        ...values,
        options: {
            encrypt: values.options?.encrypt ?? false,
            trustServerCertificate: values.options?.trustServerCertificate ?? true,
        },
    };
}

export default function DbConnectionSettings() {
    const { message } = App.useApp();
    const { dbConfig, loaded, updateDbConfig } = useParamSuggest();
    const [form] = Form.useForm<DbConnectionConfig>();
    const [testingDb, setTestingDb] = useState(false);

    useEffect(() => {
        if (!loaded) return;
        form.setFieldsValue(dbConfig);
    }, [dbConfig, form, loaded]);

    const handleSave = useCallback(async () => {
        const values = await form.validateFields();
        updateDbConfig(buildDbConfig(values));
        message.success('数据库配置已保存');
    }, [form, updateDbConfig, message]);

    const handleTestConnection = useCallback(async () => {
        const values = await form.validateFields();
        setTestingDb(true);
        try {
            const result = await testDbConnection(buildDbConfig(values));
            if (result.ok) {
                message.success('数据库连接成功');
            } else {
                message.error(result.error ?? '数据库连接失败');
            }
        } finally {
            setTestingDb(false);
        }
    }, [form, message]);

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                数据库连接
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                配置 SQL Server 连接，供入参智能提示等功能查询字典数据
            </Typography.Paragraph>
            <SettingsConfigPath fileName={DB_CONFIG_FILE} label="数据库配置保存在" />

            <div className="settings-panel-group">
                <Form
                    form={form}
                    layout="vertical"
                    className="settings-form"
                    initialValues={dbConfig}
                >
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item
                            label="服务器"
                            name="server"
                            rules={[{ required: true, message: '请输入服务器地址' }]}
                        >
                            <Input placeholder="127.0.0.1" />
                        </Form.Item>
                        <Form.Item label="端口" name="port">
                            <InputNumber className="w-full" min={1} max={65535} />
                        </Form.Item>
                        <Form.Item
                            label="数据库"
                            name="database"
                            rules={[{ required: true, message: '请输入数据库名' }]}
                        >
                            <Input placeholder="数据库名称" />
                        </Form.Item>
                        <Form.Item
                            label="用户名"
                            name="user"
                            rules={[{ required: true, message: '请输入用户名' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="密码"
                            name="password"
                            rules={[{ required: true, message: '请输入密码' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                        <Form.Item label="查询超时（毫秒）" name="queryTimeoutMs">
                            <InputNumber className="w-full" min={1000} max={60000} step={1000} />
                        </Form.Item>
                        <Form.Item label="最大返回行数" name="maxRows">
                            <InputNumber className="w-full" min={1} max={5000} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item
                            label="加密连接"
                            name={['options', 'encrypt']}
                            valuePropName="checked"
                        >
                            <Switch className="settings-switch" size="small" />
                        </Form.Item>
                        <Form.Item
                            label="信任服务器证书"
                            name={['options', 'trustServerCertificate']}
                            valuePropName="checked"
                        >
                            <Switch className="settings-switch" size="small" />
                        </Form.Item>
                    </div>
                </Form>
                <div className="settings-panel-footer">
                    <Button loading={testingDb} onClick={() => void handleTestConnection()}>
                        测试连接
                    </Button>
                    <Button
                        type="primary"
                        icon={<DatabaseOutlined />}
                        onClick={() => void handleSave()}
                    >
                        保存连接
                    </Button>
                </div>
            </div>

            {loaded && dbConfig.database ? (
                <Typography.Paragraph className="settings-form-meta">
                    当前配置：{dbConfig.server}
                    {dbConfig.port ? `:${dbConfig.port}` : ''} / {dbConfig.database}
                </Typography.Paragraph>
            ) : null}
        </div>
    );
}
