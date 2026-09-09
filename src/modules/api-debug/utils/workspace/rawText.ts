import type { ParamItem } from '../../types/workspace';
import { parseKcbpAddress } from '../kcbp/kcbpAddress';
import { mergeCommonParams } from './commonParams';

/** 入参 raw 展示文本：KCBP → INI 风格行，KGBP → lbm XML 模板。
 *  两种格式均为「快速填充」解析器（paramText.parseQuickFillText）的逆操作，
 *  输出可直接粘贴回快速填充还原参数。
 *
 *  内联格式固有限制（与快速填充解析器一致，无法消除）：
 *  - KCBP 值内包含「,标识符:」样式的片段会被解析器误判为下一个参数；
 *  - KCBP 值首尾的引号（'q' / "q"）会在解析时被剥除；
 *  - KGBP 值不做 XML 转义（本应用 lbm 解析器不解码实体）。 */

export interface KcbpRawTextOptions {
    /** case 标题，作为 INI 前缀「标题=功能号;」 */
    title: string;
    /** 功能号（地址栏 msgtype，空时回退 funcid 参数值） */
    msgtype: string;
}

export interface KgbpRawTextOptions {
    /** 功能号（地址栏 msgtype，空时回退 funcid 参数值） */
    msgtype: string;
    /** case 标题 → lbm@describe */
    describe: string;
    /** 地址栏 ?service= → lbm@service_name */
    service?: string;
    /** 地址栏 ?nodeid= → lbm@node_id */
    nodeId?: string;
    /** 地址栏 clientsessionid 为 @custid 时取 custid 参数值，否则为空 */
    channel: string;
}

const isDisabledParam = (param: ParamItem): boolean => param.type === 'disabled';

/** 功能号取值：地址栏 msgtype 优先，为空时回退 funcid 参数值 */
export function resolveRawMsgtype(addressMsgtype: string, params: ParamItem[]): string {
    const fromAddress = addressMsgtype.trim();
    if (fromAddress) return fromAddress;
    return params.find((param) => param.name === 'funcid')?.value.trim() ?? '';
}

/** KGBP channel 取值：地址栏 clientsessionid 为 @custid 时取 custid 参数值，否则为空 */
export function resolveKgbpChannel(
    clientSessionId: string | undefined,
    params: ParamItem[],
): string {
    if (clientSessionId?.trim() !== '@custid') return '';
    return params.find((param) => param.name === 'custid')?.value ?? '';
}

export interface ParamsRawTextOptions {
    /** 协议：'KGBP' 走 XML，其余走 KCBP INI */
    protocol: string;
    /** 地址栏（用于解析 msgtype/service/nodeId/clientsessionid） */
    address: string;
    /** case 标题（KCBP 前缀 / KGBP describe） */
    tabName: string;
    /** case 参数 */
    params: ParamItem[];
    /** 公共参数（发送时合并进请求，同名时 case 覆盖） */
    commonParams: ParamItem[];
}

/** 组装入参 raw 展示文本：与实际发送一致 —— 先合并公共参数
 *  （mergeCommonParams：公共在前、同名 case 覆盖），再按协议序列化。 */
export function buildParamsRawText(options: ParamsRawTextOptions): string {
    const addressParts = parseKcbpAddress(options.address);
    const effectiveParams = mergeCommonParams(options.commonParams, options.params);
    const msgtype = resolveRawMsgtype(addressParts.msgtype, effectiveParams);
    if (options.protocol === 'KGBP') {
        return serializeParamsToKgbpXml(effectiveParams, {
            msgtype,
            describe: options.tabName,
            service: addressParts.service,
            nodeId: addressParts.nodeId,
            channel: resolveKgbpChannel(addressParts.clientSessionId, effectiveParams),
        });
    }
    return serializeParamsToKcbpIni(effectiveParams, {
        title: options.tabName,
        msgtype,
    });
}

/** KCBP INI 风格：「标题=功能号;name:value,...」，禁用参数带 # 前缀。
 *  标题为空时省略「标题=功能号;」整段前缀（保证输出仍可被快速填充解析；
 *  功能号信息由首个 funcid 参数承载）。
 *  值不做引号/转义处理（解析器按逗号+key: 前瞻切分，保留值内空格）。 */
export function serializeParamsToKcbpIni(params: ParamItem[], options: KcbpRawTextOptions): string {
    const pairs = params.map((param) => {
        const prefix = isDisabledParam(param) ? '#' : '';
        return `${prefix}${param.name}:${param.value}`;
    });
    const title = options.title.trim();
    const lead = title ? `${title}=${options.msgtype.trim()};` : '';
    return `${lead}${pairs.join(',')}`;
}

/** KGBP lbm XML 模板：头属性全量展示，param 属性除 defaultvalue 外写死。
 *  值不做 XML 转义（本应用 lbm 解析器不解码实体，转义会破坏往返还原）。 */
export function serializeParamsToKgbpXml(params: ParamItem[], options: KgbpRawTextOptions): string {
    const attrs = [
        `name="${options.msgtype.trim()}"`,
        `describe="${options.describe.trim()}"`,
        `service_name="${options.service?.trim() ?? ''}"`,
        `node_id="${options.nodeId?.trim() ?? ''}"`,
        `channel="${options.channel.trim()}"`,
    ].join(' ');
    const lines = params
        .filter((param) => !isDisabledParam(param))
        .map(
            (param) =>
                `    <param name="${param.name}" datatype="C" defaultvalue="${param.value}" InHareSocketDataType="S" allownull="yes"/>`,
        );
    return [`<lbm ${attrs}>`, ...lines, '</lbm>'].join('\n');
}
