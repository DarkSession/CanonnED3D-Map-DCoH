import { Vector2 } from 'three';
import { ED3DMap, SystemPoint } from './ED3DMap';
import { System } from './System';

export class Action {
    private pointer: Vector2;
    private currentSystemHover: SystemPoint | null = null;
    private currentSystemSelected: SystemPoint | null = null;
    private pointerClickStart: number | null = null;
    private pointerDown: boolean = false;

    public constructor(
        private readonly ED3DMap: ED3DMap) {
        this.pointer = new Vector2();
        this.ED3DMap.events.on("init", () => {
            this.init();
        });
        this.ED3DMap.events.on("systemHoverChanged", (system: System | null) => {
            if (!system) {
                this.currentSystemHover = null;
            }
        });
        this.ED3DMap.events.on("systemSelectionChanged", (system: System | null) => {
            if (!system) {
                this.currentSystemSelected = null;
            }
        });
    }

    private init(): void {
        document.addEventListener('pointermove', (event: PointerEvent) => {
            this.onPointerMove(event);
        });
        document.addEventListener('pointerdown', (event: PointerEvent) => {
            this.onPointerDown(event);
        });
        document.addEventListener('pointerup', (event: PointerEvent) => {
            this.onPointerUp(event);
        });
    }

    private async onPointerMove(event: PointerEvent): Promise<void> {
        if (this.pointerDown || !this.ED3DMap.controlsEnabled) {
            return;
        }
        this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);
        const intersects = this.ED3DMap.raycasterIntersectObjects(this.pointer);
        let systemFound = false;
        if (intersects.length) {
            const intersectSystemPoints = intersects.filter(i => i.object instanceof SystemPoint && i.object.visible && i.object.sprite.visible).sort((a, b) => {
                if (a.distanceToRay && b.distanceToRay) {
                    return a.distanceToRay - b.distanceToRay;
                }
                return a.distance - b.distance;
            });
            for (const intersect of intersectSystemPoints) {
                if (intersect.object instanceof SystemPoint) {
                    if (this.currentSystemHover !== intersect.object) {
                        this.currentSystemHover = intersect.object;
                        await this.ED3DMap.events.emit("systemHoverChanged", intersect.object.system);
                    }
                    systemFound = true;
                    break;
                }
            }
        }
        if (!systemFound && this.currentSystemHover) {
            this.currentSystemHover = null;
            await this.ED3DMap.events.emit("systemHoverChanged", null);
        }
    }

    private onPointerDown(event: PointerEvent): void {
        this.pointerDown = true;
        this.pointerClickStart = Date.now();
    }

    private async onPointerUp(event: PointerEvent): Promise<void> {
        this.pointerDown = false;
        if (this.ED3DMap.controlsEnabled &&
            this.currentSystemHover && this.currentSystemHover !== this.currentSystemSelected &&
            this.pointerClickStart !== null && (Date.now() - this.pointerClickStart) <= 200) {
            this.currentSystemSelected = this.currentSystemHover;
            await this.ED3DMap.events.emit("systemSelectionChanged", this.currentSystemSelected.system);
        }
    }
}