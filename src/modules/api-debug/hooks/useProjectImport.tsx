import { useCallback } from 'react';
import { App, Button, message } from 'antd';
import type { ProjectData, TabData } from '../types/workspace';
import type { ImportFileFormat } from '../../../types/electron';
import { getElectronAPI } from '../../../lib/electron';
import { getProjectHostTemplate, parseKuabImportJson } from '../utils/import/kuabImport';
import { parseConfigIni } from '../utils/import/configIniImport';

interface UseProjectImportOptions {
    projects: ProjectData[];
    importCases: (projectIndex: number, cases: TabData[]) => void;
}

export function useProjectImport({ projects, importCases }: UseProjectImportOptions) {
    const { modal } = App.useApp();

    const runImport = useCallback(
        async (projectIndex: number, format: ImportFileFormat) => {
            const api = getElectronAPI();
            if (!api?.openImportFile) {
                message.error('当前环境不支持文件导入');
                return;
            }

            const project = projects[projectIndex];
            if (!project) return;

            try {
                const result = await api.openImportFile(format);
                if (!result.opened) return;

                const hostTemplate = getProjectHostTemplate(project);
                const cases =
                    result.format === 'json'
                        ? parseKuabImportJson(result.data, hostTemplate)
                        : parseConfigIni(result.content, hostTemplate);

                if (cases.length === 0) {
                    message.warning(
                        format === 'json'
                            ? '未找到可导入的接口，请检查 JSON 格式与 msgtype_src 字段'
                            : '未找到可导入的接口，请检查 INI 格式（title=msgtype;key:value,...）',
                    );
                    return;
                }

                importCases(projectIndex, cases);
                const formatLabel = format === 'json' ? 'JSON' : 'INI';
                message.success(`已从 ${formatLabel} 导入 ${cases.length} 个接口`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                message.error(`导入失败：${errorMessage}`);
            }
        },
        [importCases, projects],
    );

    const openImportFormatPicker = useCallback(
        (projectIndex: number) => {
            const instance = modal.confirm({
                title: '导入接口',
                content: (
                    <div className="import-format-picker">
                        <p className="import-format-picker-desc">请选择要导入的文件格式</p>
                        <div className="import-format-picker-actions">
                            <Button
                                block
                                onClick={() => {
                                    instance.destroy();
                                    runImport(projectIndex, 'json');
                                }}
                            >
                                JSON 文件
                            </Button>
                            <Button
                                block
                                onClick={() => {
                                    instance.destroy();
                                    runImport(projectIndex, 'ini');
                                }}
                            >
                                INI 文件 (Config.ini)
                            </Button>
                        </div>
                    </div>
                ),
                footer: null,
                closable: true,
                centered: true,
                mousePosition: null,
                icon: null,
            });
        },
        [modal, runImport],
    );

    return { openImportFormatPicker };
}
