import type { ReactNode } from 'react';
import { Typography } from 'antd';
import {
    analyzeSuggestSelectSql,
    summarizeSqlDependencies,
} from '../../utils/suggest/paramSuggestSql';

interface ParamSuggestSqlAnalysisProps {
    sql: string;
}

function StatusLine({ ok, warn, children }: { ok?: boolean; warn?: boolean; children: ReactNode }) {
    const prefix = ok ? '\u2713' : warn ? '\u25cb' : '\u274c';
    const className = ok
        ? 'param-suggest-sql-check-ok'
        : warn
          ? 'param-suggest-sql-check-warn'
          : 'param-suggest-sql-check-error';
    return (
        <Typography.Text className={`text-xs block ${className}`}>
            {prefix} {children}
        </Typography.Text>
    );
}

export default function ParamSuggestSqlAnalysis({ sql }: ParamSuggestSqlAnalysisProps) {
    const analysis = analyzeSuggestSelectSql(sql);
    const deps = summarizeSqlDependencies(sql);

    return (
        <div className="param-suggest-sql-analysis">
            <Typography.Text type="secondary" className="text-xs block mb-1">
                检测结果
            </Typography.Text>
            {analysis.structure.ok ? (
                <StatusLine ok>SQL 结构合法</StatusLine>
            ) : (
                <StatusLine>{analysis.structure.reason}</StatusLine>
            )}
            {analysis.hasValueAlias ? (
                <StatusLine ok>检测到 value 别名</StatusLine>
            ) : (
                <StatusLine>缺少 value 别名（须使用 value = ... 或 AS value）</StatusLine>
            )}
            {analysis.hasRemarkAlias ? (
                <StatusLine ok>检测到 remark 别名</StatusLine>
            ) : (
                <StatusLine warn>remark 可选，未检测到</StatusLine>
            )}
            {deps.required.length === 0 && deps.optional.length === 0 ? (
                <StatusLine ok>无 SQL 依赖，将作为全局默认规则</StatusLine>
            ) : (
                <>
                    <Typography.Text type="secondary" className="text-xs block mt-1 mb-0.5">
                        检测到依赖
                    </Typography.Text>
                    {deps.required.map((name) => (
                        <StatusLine key={`req-${name}`} ok>
                            {name}
                        </StatusLine>
                    ))}
                    {deps.optional.map((name) => (
                        <StatusLine key={`opt-${name}`} ok>
                            {name}（可选）
                        </StatusLine>
                    ))}
                </>
            )}
        </div>
    );
}
