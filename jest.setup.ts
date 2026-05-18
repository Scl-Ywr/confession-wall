import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

global.fetch ??= jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    ip: '127.0.0.1',
    city: '测试城市',
    province: '测试省份',
    country: '测试国家',
  }),
} as Response);
