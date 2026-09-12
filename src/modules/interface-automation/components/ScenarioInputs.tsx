import { Switch } from 'antd';
import { Input, Password, Select } from '@/components/ui/primitives';
import type { AutomationInputValue, AutomationScenarioMetadata } from '@/shared/automation/types';

export default function ScenarioInputs({
    metadata,
    values,
    onChange,
}: {
    metadata?: AutomationScenarioMetadata;
    values: Record<string, AutomationInputValue>;
    onChange: (name: string, value: AutomationInputValue) => void;
}) {
    const entries = Object.entries(metadata?.inputs ?? {});
    if (entries.length === 0) return <span className="automation-input-empty">无运行参数</span>;
    return (
        <div className="automation-inputs">
            {entries.map(([name, definition]) => {
                const label = definition.label ?? name;
                return (
                    <label key={name} className="automation-input-field">
                        <span>
                            {label}
                            {definition.required ? ' *' : ''}
                        </span>
                        {definition.type === 'boolean' ? (
                            <Switch
                                checked={Boolean(values[name])}
                                onChange={(value) => onChange(name, value)}
                            />
                        ) : definition.type === 'select' ? (
                            <Select
                                size="sm"
                                value={String(values[name] ?? '')}
                                options={definition.options}
                                onChange={(value) => onChange(name, String(value))}
                            />
                        ) : definition.sensitive ? (
                            <Password
                                size="small"
                                value={String(values[name] ?? '')}
                                onChange={(event) => onChange(name, event.target.value)}
                            />
                        ) : (
                            <Input
                                size="sm"
                                type={definition.type === 'number' ? 'number' : 'text'}
                                value={String(values[name] ?? '')}
                                onChange={(event) => onChange(name, event.target.value)}
                            />
                        )}
                    </label>
                );
            })}
        </div>
    );
}
