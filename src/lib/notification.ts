// 通知工具，封装react-hot-toast功能
import toast from 'react-hot-toast';

// 显示成功通知
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};

// 显示错误通知
export const showError = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
};

// 显示警告通知
export const showWarning = (message: string) => {
  toast.error(message, {
    duration: 3500,
    position: 'top-right',
  });
};

// 显示信息通知
export const showInfo = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};