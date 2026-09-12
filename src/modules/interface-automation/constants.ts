export const INTERFACE_AUTOMATION_MODULE_ID = 'interface-automation';

export const DEFAULT_AUTOMATION_SCRIPT = `scenario(
    {
        inputs: {
            custid: input.string({ label: '客户号', required: true }),
        },
    },
    async (t) => {
        const response = await t.step('调用接口', () =>
            t.api.call('150501', {
                custid: t.input.custid,
            }),
        );

        t.expect(response, '接口业务成功').businessOk();
    },
);
`;
