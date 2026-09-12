import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { loadAutomationEnvironments } from '../services/automationEnvironmentData';

/** 加载可选运行环境，并维护 Agent 面板当前选中的环境。 */
export function useAgentEnvironments(): {
    environmentsRef: MutableRefObject<KcxpEnvironment[]>;
    environmentId: string;
    setEnvironmentId: (id: string) => void;
} {
    const environmentsRef = useRef<KcxpEnvironment[]>([]);
    const [environmentId, setEnvironmentId] = useState('');

    useEffect(() => {
        void loadAutomationEnvironments().then((items) => {
            environmentsRef.current = items;
            setEnvironmentId((current) => current || items[0]?.id || '');
        });
    }, []);

    return { environmentsRef, environmentId, setEnvironmentId };
}
