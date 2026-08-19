import type { KcbpCallOutcome } from './types';

type KcbpCallFeedback = {
    level: 'error' | 'info' | 'warning' | 'success';
    message: string;
};

function getScriptFeedback(outcome: KcbpCallOutcome): KcbpCallFeedback | null {
    const { scriptTest, scriptError } = outcome;
    if (scriptTest && !scriptTest.passed) {
        return { level: 'error', message: `\u6d4b\u8bd5\u5931\u8d25\uff1a${scriptTest.message}` };
    }
    if (scriptError && !scriptTest) {
        return { level: 'error', message: scriptError };
    }
    return null;
}

function getResponseFeedback(outcome: KcbpCallOutcome): KcbpCallFeedback | null {
    const { response, status, missingParam } = outcome;
    if (String(response.code) === '-1') {
        return { level: 'error', message: response.message || 'KCBP \u8c03\u7528\u5931\u8d25' };
    }
    if (missingParam) {
        return {
            level: 'info',
            message: `\u5df2\u81ea\u52a8\u6dfb\u52a0\u5165\u53c2 ${missingParam.name}\uff0c\u8bf7\u586b\u5199\u540e\u91cd\u65b0\u53d1\u9001`,
        };
    }
    if (status.kind === 'error') {
        return {
            level: 'error',
            message: status.businessMsg || '\u4e1a\u52a1\u8c03\u7528\u5931\u8d25',
        };
    }
    if (status.kind === 'warning') {
        return { level: 'warning', message: status.businessMsg || '\u4e1a\u52a1\u8b66\u544a' };
    }
    return null;
}

function getSuccessFeedback(outcome: KcbpCallOutcome): KcbpCallFeedback {
    const { response, msgtype, scriptTest } = outcome;
    if (scriptTest?.passed) {
        const rows = response.stats?.rows ?? 0;
        return {
            level: 'success',
            message: `\u6d4b\u8bd5\u901a\u8fc7\uff1a${scriptTest.message}\uff08${msgtype} \u8fd4\u56de ${rows} \u884c\uff09`,
        };
    }

    const rows = response.stats?.rows ?? 0;
    return {
        level: 'success',
        message: `${msgtype}\u8c03\u7528\u5b8c\u6210\uff0c\u8fd4\u56de ${rows} \u884c`,
    };
}

export function getKcbpCallFeedback(outcome: KcbpCallOutcome): KcbpCallFeedback {
    return (
        getScriptFeedback(outcome) ?? getResponseFeedback(outcome) ?? getSuccessFeedback(outcome)
    );
}
