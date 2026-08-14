import { getCardClassNames } from '@/components/ui/primitives/cardClassNames';
import type { CardVariant } from '@/components/ui/primitives/types';

export type ModuleCardVariant = Exclude<CardVariant, 'panel'>;

export function getModuleCardClassName(
    variant: ModuleCardVariant,
    options?: { padding?: boolean; className?: string },
): string {
    return getCardClassNames(variant, options);
}
