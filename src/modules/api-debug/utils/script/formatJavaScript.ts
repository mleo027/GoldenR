import prettier from 'prettier/standalone';
import prettierPluginBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';

const PRETTIER_OPTIONS = {
    parser: 'babel' as const,
    plugins: [prettierPluginBabel, prettierPluginEstree],
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all' as const,
    printWidth: 100,
    arrowParens: 'always' as const,
};

export async function formatJavaScript(source: string): Promise<string> {
    const trimmed = source.trim();
    if (!trimmed) return source;

    try {
        return await prettier.format(source, PRETTIER_OPTIONS);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`JavaScript 格式化失败：${message}`);
    }
}
