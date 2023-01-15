import * as THREE from 'three';
import { ED3DMap, SystemPoint } from './ED3DMap';

export class Action {
    private pointer: THREE.Vector2;
    private currentSystemHover: SystemPoint | null = null;
    private currentSystemSelected: SystemPoint | null = null;

    public constructor(
        private readonly ED3DMap: ED3DMap) {
        this.pointer = new THREE.Vector2();
        this.ED3DMap.events.on("init", () => {
            this.init();
        });
    }

    private init(): void {
        document.addEventListener('pointermove', (event: PointerEvent) => {
            this.onPointerMove(event);
        });
        document.addEventListener('pointerdown', (event: PointerEvent) => {
            this.onPointerDown(event);
        });
        //document.addEventListener('keydown', onDocumentKeyDown);
        //document.addEventListener('keyup', onDocumentKeyUp);
    }

    private async onPointerMove(event: PointerEvent): Promise<void> {
        this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);
        const intersects = this.ED3DMap.raycasterIntersectObjects(this.pointer);
        let systemFound = false;
        if (intersects.length) {
            const intersectSystemPoints = intersects.filter(i => i.object instanceof SystemPoint).sort((a, b) => {
                if (a.distanceToRay && b.distanceToRay) {
                    return a.distanceToRay - b.distanceToRay;
                }
                return a.distance - b.distance;
            });
            for (const intersect of intersectSystemPoints) {
                if (intersect.object instanceof SystemPoint && intersect.object.visible) {
                    if (this.currentSystemHover !== intersect.object) {
                        this.currentSystemHover = intersect.object;

                        // this.cursorHover.lookAt(this.ED3DMap.camera.position);
                        await this.ED3DMap.events.emit("systemHoverChanged", intersect.object.system);
                    }
                    systemFound = true;
                    break;
                    //-- Add text
                    // this.Ed3d.HUD.addText('system_hover', intersect.object.system.configuration.name, 0, 4, 0, 3, this.cursorHover);
                }
            }
        }
        if (!systemFound && this.currentSystemHover) {
            this.currentSystemHover = null;
            await this.ED3DMap.events.emit("systemHoverChanged", null);
        }
    }

    private async onPointerDown(event: PointerEvent): Promise<void> {
        if (this.currentSystemHover && this.currentSystemHover !== this.currentSystemSelected) {
            this.currentSystemSelected = this.currentSystemHover;
            await this.ED3DMap.events.emit("systemSelectionChanged", this.currentSystemSelected.system);
        }
    }
}