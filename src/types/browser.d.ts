// 扩展全局类型，支持浏览器的非标准全屏API属性

declare global {
  interface Document {
    // WebKit浏览器（Safari）的全屏属性和方法
    webkitFullscreenElement: Element | null;
    webkitEnterFullscreen: () => void;
    webkitRequestFullscreen: (options?: FullscreenOptions) => Promise<void>;
    webkitExitFullscreen: () => Promise<void>;
    
    // Firefox浏览器的全屏属性和方法
    mozFullScreenElement: Element | null;
    mozRequestFullScreen: (options?: FullscreenOptions) => Promise<void>;
    mozCancelFullScreen: () => Promise<void>;
    
    // IE/Edge浏览器的全屏属性和方法
    msFullscreenElement: Element | null;
    msRequestFullscreen: (options?: FullscreenOptions) => Promise<void>;
    msExitFullscreen: () => Promise<void>;
  }
  
  interface HTMLElement {
    // WebKit浏览器（Safari）的全屏方法
    webkitEnterFullscreen: () => void;
    webkitRequestFullscreen: (options?: FullscreenOptions) => Promise<void>;
  }
}

export {};
