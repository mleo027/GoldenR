import type { CapabilityInvokeRequest, CapabilityInvokeResponse } from '@/shared/capabilities/host';
import { capabilityHostBridge } from '@/runtime/capabilityFacade';
import { capabilityRegistry } from './registry';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 执行一次外部调用。
 *
 * 上下文由所属模块的工厂组装（平台不知道其内容），再交给模块的能力实现——平台从
 * 头到尾不解释业务语义，只知道"哪个能力属于哪个模块"。
 *
 * 失败以 `ok: false` 回填而不是抛出：传输层只负责搬运结果。
 */
async function execute(request: CapabilityInvokeRequest): Promise<CapabilityInvokeResponse> {
    try {
        const result = await capabilityRegistry.dispatch(request.name, request.args);
        return { requestId: request.requestId, ok: true, result };
    } catch (error) {
        return { requestId: request.requestId, ok: false, error: messageOf(error) };
    }
}

/**
 * 让渲染层成为外部调用的执行宿主。
 *
 * 只做转发：不绕过任何既有约束——生产环境禁写、SQL 白名单校验、报告行数限制仍在
 * 模块的运行时与能力实现内部生效，与调用方是谁无关。
 *
 * @returns 取消订阅函数
 */
export function startCapabilityHost(): () => void {
    return capabilityHostBridge.onInvoke((request) => {
        void execute(request)
            .then((response) => capabilityHostBridge.respond(response))
            .catch((error: unknown) => {
                // 回填失败已无补救手段，记录以免产生未处理的 rejection。
                console.error('[capability-host] 回填能力调用结果失败', error);
            });
    });
}
