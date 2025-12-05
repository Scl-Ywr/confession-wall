import toast, { ToastOptions } from 'react-hot-toast';

// Toast通知工具函数
export const showToast = {
  // 成功通知
  success: (message: string, duration?: number) => {
    toast.success(message, { duration });
  },
  
  // 错误通知
  error: (message: string, duration?: number) => {
    toast.error(message, { duration });
  },
  
  // 警告通知
  warning: (message: string, duration?: number) => {
    // react-hot-toast没有warning方法，使用error样式代替
    toast.error(message, { duration });
  },
  
  // 信息通知
  info: (message: string, duration?: number) => {
    toast(message, { duration });
  },
  
  // 自定义通知
  custom: (message: string, options?: ToastOptions) => {
    toast(message, options);
  },
  
  // 加载中通知
  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, options);
  },
  
  // 更新通知
  update: (id: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    switch (type) {
      case 'success':
        toast.success(message, { id });
        break;
      case 'error':
        toast.error(message, { id });
        break;
      case 'warning':
        // react-hot-toast没有warning方法，使用error样式代替
        toast.error(message, { id });
        break;
      case 'info':
        toast(message, { id });
        break;
    }
  },
  
  // 关闭通知
  dismiss: (id?: string) => {
    toast.dismiss(id);
  },
};
