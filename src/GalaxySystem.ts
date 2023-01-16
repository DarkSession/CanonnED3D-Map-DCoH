import { CylinderGeometry, Mesh, Object3D, ShapeGeometry, TorusGeometry } from 'three';
import { ED3DMap } from './ED3DMap';
import { System } from './System';

export class GalaxySystem {
    private cursorScale: number = 1;
    private cursorHover: Object3D;
    private cursorSelection: Object3D;
    private hoverText!: Mesh;

    public constructor(
        private readonly ED3DMap: ED3DMap) {
        {
            this.cursorHover = new Object3D();
            this.cursorHover.visible = false;
            const geometryL = new TorusGeometry(4, 0.4, 4, 48);
            const selection = new Mesh(geometryL, this.ED3DMap.textures.gray);
            selection.rotation.x = Math.PI / 2;
            this.cursorHover.add(selection);

            this.ED3DMap.addToScene(this.cursorHover);
        }
        {
            this.cursorSelection = new Object3D();
            this.cursorSelection.visible = false;

            // Ring around the system
            const geometryL = new TorusGeometry(5.4, 0.4, 4, 48);

            const selection = new Mesh(geometryL, this.ED3DMap.textures.selected);
            selection.rotation.x = Math.PI / 2;

            this.cursorSelection.add(selection);

            // Create a cone on the selection
            const geometryCone = new CylinderGeometry(0, 4, 12, 4, 1, false);
            const cone = new Mesh(geometryCone, this.ED3DMap.textures.selected);
            cone.position.set(0, 12.5, 0);
            cone.rotation.x = Math.PI;
            this.cursorSelection.add(cone);

            // Inner cone
            const geometryConeInner = new CylinderGeometry(0, 2.88, 12, 4, 1, false);
            const coneInner = new Mesh(geometryConeInner, this.ED3DMap.textures.black);
            coneInner.position.set(0, 12.7, 0);
            coneInner.rotation.x = Math.PI;
            this.cursorSelection.add(coneInner);

            this.ED3DMap.addToScene(this.cursorSelection);
        }

        this.ED3DMap.events.on("init", () => {
            this.init();
        });
        this.ED3DMap.events.on("render", () => {
            this.render();
        });
        this.ED3DMap.events.on("enableFarView", eventData => {
            this.cursorScale = 40;
            this.cursorHover.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);
            this.cursorSelection.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);
        });
        this.ED3DMap.events.on("disableFarView", eventData => {
            this.cursorScale = 1;
            this.cursorHover.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);
            this.cursorSelection.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);
        });
        this.ED3DMap.events.on("systemHoverChanged", (system: System | null) => {
            this.systemHoverChanged(system);
        });
        this.ED3DMap.events.on("systemSelectionChanged", (system: System | null) => {
            this.systemSelectionChanged(system);
        });
    }

    private init(): void {
        const textShapes = this.ED3DMap.font!.generateShapes("System Name", 3);
        const textGeo = new ShapeGeometry(textShapes);
        this.hoverText = new Mesh(textGeo, this.ED3DMap.textures.white);
        this.hoverText.visible = false;
        this.ED3DMap.addToScene(this.hoverText);
    }

    private render(): void {
        if (this.hoverText?.visible) {
            this.hoverText.lookAt(this.ED3DMap.camera.position);
        }
    }

    private systemHoverChanged(system: System | null): void {
        if (system) {
            this.cursorHover.position.set(system.x, system.y, system.z);
            this.cursorHover.visible = true;
            this.cursorHover.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);

            this.hoverText.geometry.dispose();

            const textShapes = this.ED3DMap.font!.generateShapes(system?.configuration.name, 3);
            const textGeo = new ShapeGeometry(textShapes);

            this.hoverText.visible = true;
            this.hoverText.geometry = textGeo;
            this.hoverText.position.set(system.x, system.y + 4, system.z);
            this.hoverText.rotation.y = -Math.PI / 2;
            this.hoverText.lookAt(this.ED3DMap.camera.position);
        }
        else {
            this.cursorHover.visible = false;
            this.hoverText.visible = false;
        }
        this.ED3DMap.requestRender();
    }

    private systemSelectionChanged(system: System | null): void {
        if (system) {
            this.cursorSelection.visible = true;
            this.cursorSelection.position.set(system.x, system.y, system.z);
            this.cursorSelection.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);
        }
        else {
            this.cursorSelection.visible = false;
        }
        this.ED3DMap.requestRender();
    }
}