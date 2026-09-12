export const AUTOMATION_DSL_TYPES = `
declare function scenario(metadata: { inputs?: Record<string, unknown> }, handler: (t: ScenarioContext) => Promise<void>): void;
declare const input: {
  string(options?: InputOptions): unknown;
  number(options?: InputOptions): unknown;
  boolean(options?: InputOptions): unknown;
  select(options: InputOptions & { options: Array<{ label: string; value: string }> }): unknown;
};
interface InputOptions { label?: string; required?: boolean; sensitive?: boolean; default?: string | number | boolean; min?: number; max?: number; }
interface ScenarioContext {
  readonly input: Record<string, string | number | boolean | null>;
  readonly vars: { get(name: string): unknown; set(name: string, value: unknown): void; all(): Record<string, unknown> };
  step<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
  cleanup(name: string, callback: () => Promise<void> | void): void;
  sql: { query(sql: string, params?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>; execute(sql: string, params?: Record<string, unknown>): Promise<unknown> };
  api: { call(msgtype: string, fields: Record<string, unknown>): Promise<Record<string, unknown>> };
  expect(actual: unknown, description?: string): Expectation;
  log(value: unknown): void;
  info(value: unknown): void;
  warn(value: unknown): void;
}
interface Expectation { toBe(value: unknown): void; toEqual(value: unknown): void; toBeTruthy(): void; toContain(value: unknown): void; toHaveLength(value: number): void; toMatchObject(value: object): void; toHaveRow(value: object): void; toChangeBy(before: number, delta: number): void; businessOk(): void; }
`;
