import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import { signInWithLogto } from '@/lib/logto/client';

jest.mock('@/lib/logto/client', () => ({
  signInWithLogto: jest.fn(),
}));

describe('SocialLoginButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染Google和GitHub登录按钮', () => {
    render(<SocialLoginButtons />);

    expect(screen.getByText('使用 Google 登录')).toBeInTheDocument();
    expect(screen.getByText('使用 GitHub 登录')).toBeInTheDocument();
  });

  it('点击Google按钮应该调用signInWithLogto', async () => {
    render(<SocialLoginButtons />);

    const googleButton = screen.getByText('使用 Google 登录').closest('button');
    fireEvent.click(googleButton!);

    await waitFor(() => {
      expect(signInWithLogto).toHaveBeenCalledWith('google');
    });
  });

  it('点击GitHub按钮应该调用signInWithLogto', async () => {
    render(<SocialLoginButtons />);

    const githubButton = screen.getByText('使用 GitHub 登录').closest('button');
    fireEvent.click(githubButton!);

    await waitFor(() => {
      expect(signInWithLogto).toHaveBeenCalledWith('github');
    });
  });

  it('禁用状态下按钮不应该可点击', () => {
    render(<SocialLoginButtons disabled={true} />);

    const googleButton = screen.getByText('使用 Google 登录').closest('button');
    const githubButton = screen.getByText('使用 GitHub 登录').closest('button');

    expect(googleButton).toBeDisabled();
    expect(githubButton).toBeDisabled();
  });

  it('加载状态下应该显示加载指示器', () => {
    render(<SocialLoginButtons loading={true} />);

    const loadingTexts = screen.getAllByText((text) => text.includes('登录中'));
    expect(loadingTexts).toHaveLength(2);
  });

  it('应该显示分隔线和提示文字', () => {
    render(<SocialLoginButtons />);

    expect(screen.getByText('或使用第三方账号登录')).toBeInTheDocument();
  });
});
