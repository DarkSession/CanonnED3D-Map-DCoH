
export * from './ed3dmap/ed3dmap';
import { Ed3d } from './ed3dmap/ed3dmap';

declare global {
    interface Window { Ed3d: any; }
}

window.Ed3d = Ed3d;
