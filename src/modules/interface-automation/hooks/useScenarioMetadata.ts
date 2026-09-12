import { useEffect, useState } from 'react';
import { App } from 'antd';
import type {
    AutomationInputValue,
    AutomationScenario,
    AutomationScenarioMetadata,
} from '@/shared/automation/types';
import { inspectAutomationScript } from '../services/automationRunner';
import { rememberScenarioInputs, resolveScenarioInputs } from '../utils/scenarioInputs';

export function useScenarioMetadata(scenario?: AutomationScenario) {
    const { message } = App.useApp();
    const [metadata, setMetadata] = useState<AutomationScenarioMetadata>();
    const [inputs, setInputs] = useState<Record<string, AutomationInputValue>>({});
    useEffect(() => {
        if (!scenario) return;
        const timer = window.setTimeout(() => {
            void inspectAutomationScript(scenario.script)
                .then((next) => {
                    setMetadata(next);
                    setInputs(resolveScenarioInputs(scenario.id, next));
                })
                .catch((error: unknown) => {
                    setMetadata(undefined);
                    void message.error(error instanceof Error ? error.message : String(error));
                });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [message, scenario]);
    const changeInput = (name: string, value: AutomationInputValue) => {
        if (!scenario) return;
        setInputs((current) => {
            const next = { ...current, [name]: value };
            rememberScenarioInputs(scenario.id, next);
            return next;
        });
    };
    return { metadata, inputs, changeInput };
}
