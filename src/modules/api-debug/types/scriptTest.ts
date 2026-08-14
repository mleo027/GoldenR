export type ScriptTestStepStatus = 'pass' | 'fail';

export interface ScriptTestStep {
    name: string;
    status: ScriptTestStepStatus;
    message: string;
}

export interface ScriptTestResult {
    passed: boolean;
    message: string;
    steps: ScriptTestStep[];
}

export interface ScriptTestApi {
    /** 标记当前测试步骤 */
    step(name: string): void;
    /** 断言，失败则中断并标记测试失败 */
    expect(condition: boolean, message: string): void;
    /** 显式失败 */
    fail(message: string): never;
    /** 显式通过，建议作为 main 的返回值 */
    pass(message?: string): ScriptTestResult;
    /** 当前累计结果（只读） */
    readonly result: ScriptTestResult;
}
