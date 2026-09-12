import { useAppEnvStore } from './appEnvStore';
import { useShallow } from 'zustand/react/shallow';

/** AppEnv 的公开访问入口；状态来源为 Zustand，保留原有调用 API 以降低迁移风险。 */
export function useAppEnv() {
    return useAppEnvStore(
        useShallow(({ env, loaded, updateEnv, patchEnv }) => ({
            env,
            loaded,
            updateEnv,
            patchEnv,
        })),
    );
}
