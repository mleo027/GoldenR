import { App, Form } from 'antd';
import type { RuleFormValues } from '../utils/suggest/paramSuggestRuleForm';
import { useParamSuggest } from '../store/useParamSuggest';
import {
    useRuleEditor,
    useRuleSelection,
    useRuleTester,
    useRuleTransfer,
} from './paramSuggestRules/useParamSuggestRuleSections';

export function useParamSuggestRulesSettings() {
    const { message } = App.useApp();
    const { dbConfig, rules, syncRulesToMain, reloadMainConfig } = useParamSuggest();
    const [ruleForm] = Form.useForm<RuleFormValues>();
    const selection = useRuleSelection(rules);
    const editor = useRuleEditor(rules, syncRulesToMain, ruleForm, message);
    const transfer = useRuleTransfer(rules, syncRulesToMain, message);
    const tester = useRuleTester(
        rules,
        selection.testField,
        selection.setTestField,
        reloadMainConfig,
        message,
    );

    return {
        ruleForm,
        dbConfig,
        rules,
        ...selection,
        ...editor,
        ...transfer,
        ...tester,
    };
}
