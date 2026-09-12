import type {
    AutomationInputValue,
    AutomationInputValues,
    AutomationScenarioMetadata,
    ScenarioInputDefinition,
} from '@/shared/automation/types';

const scenarioInputCache = new Map<string, AutomationInputValues>();

function normalizeNumber(
    definition: Extract<ScenarioInputDefinition, { type: 'number' }>,
    value: unknown,
): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${definition.label ?? '输入'}必须是数字`);
    if (definition.min != null && parsed < definition.min)
        throw new Error(`${definition.label ?? '输入'}不能小于 ${definition.min}`);
    if (definition.max != null && parsed > definition.max)
        throw new Error(`${definition.label ?? '输入'}不能大于 ${definition.max}`);
    return parsed;
}

function normalizeString(
    definition: Extract<ScenarioInputDefinition, { type: 'string' }>,
    value: unknown,
): string {
    const text = String(value);
    if (definition.minLength != null && text.length < definition.minLength)
        throw new Error(`${definition.label ?? '输入'}长度不足`);
    if (definition.maxLength != null && text.length > definition.maxLength)
        throw new Error(`${definition.label ?? '输入'}长度超限`);
    return text;
}

function normalizeValue(definition: ScenarioInputDefinition, value: unknown): AutomationInputValue {
    if (value == null || value === '') return definition.default ?? null;
    if (definition.type === 'number') return normalizeNumber(definition, value);
    if (definition.type === 'boolean') return Boolean(value);
    if (definition.type === 'string') return normalizeString(definition, value);
    const text = String(value);
    if (!definition.options.some((item) => item.value === text))
        throw new Error(`${definition.label ?? '输入'}不在可选范围内`);
    return text;
}

export function validateScenarioInputs(
    metadata: AutomationScenarioMetadata,
    values: Record<string, unknown>,
): AutomationInputValues {
    const result: AutomationInputValues = {};
    for (const [name, definition] of Object.entries(metadata.inputs ?? {})) {
        const value = normalizeValue(definition, values[name]);
        if (definition.required && (value == null || value === ''))
            throw new Error(`${definition.label ?? name}为必填项`);
        result[name] = value;
    }
    return result;
}

export function defaultScenarioInputs(metadata: AutomationScenarioMetadata): AutomationInputValues {
    return Object.fromEntries(
        Object.entries(metadata.inputs ?? {}).map(([name, definition]) => [
            name,
            definition.default ?? (definition.type === 'boolean' ? false : ''),
        ]),
    );
}

export function rememberScenarioInputs(scenarioId: string, values: AutomationInputValues): void {
    scenarioInputCache.set(scenarioId, { ...values });
}

export function resolveScenarioInputs(
    scenarioId: string,
    metadata: AutomationScenarioMetadata,
): AutomationInputValues {
    return { ...defaultScenarioInputs(metadata), ...scenarioInputCache.get(scenarioId) };
}
