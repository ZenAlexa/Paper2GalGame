import { Live2DCore } from '@/Core/live2DCore';
import { WebgalCore } from '@/Core/webgalCore';

export const WebGAL = new WebgalCore();
export const Live2D = new Live2DCore();

// Debug mode - uncomment to expose WebGAL globally
// window.WebGAL = WebGAL;
