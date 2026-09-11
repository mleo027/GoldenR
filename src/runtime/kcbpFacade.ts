import { apiCallRuntime } from './apiCallFacade';
import type { ApiCallRuntime } from './apiCallFacade';

/** @deprecated Use ApiCallRuntime; it supports KCBP, KGBP, and KUAB. */
export type KcbpRuntime = ApiCallRuntime;
/** @deprecated Use apiCallRuntime. */
export const kcbpRuntime = apiCallRuntime;
