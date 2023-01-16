
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import * as OrbitControls from "three/examples/jsm/controls/OrbitControls";
import { GridHelper, HemisphereLight, Mesh, Object3D, PerspectiveCamera, Raycaster, Scene, WebGLRenderer, Intersection, BufferGeometry, Material, SpriteMaterial, Points, PlaneGeometry, MeshBasicMaterial, DirectionalLight, Float32BufferAttribute, PointsMaterial, FogExp2, AdditiveBlending, Color, Sprite } from 'three';
import Emittery from 'emittery';
import { Galaxy } from './Galaxy';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { Textures } from './Textures';
import { System, SystemConfiguration } from './System';
import { Action } from './Action';
import { HUD } from './HUD';
import { Tween } from '@tweenjs/tween.js';
import { GalaxySystem } from './GalaxySystem';

interface Events {
    // loadAssetsCache should be used to download and cache all assets
    loadAssetsCache: undefined;
    // init should be used to initalize all data
    init: undefined;
    //
    destroy: undefined;
    // ready is fired when everything is has been loaded and initialized
    ready: undefined;
    // fired whenever render() is executed
    render: RenderData;
    //
    configChanged: undefined;
    // 
    enableFarView: {
        scale: number;
        withAnimation: boolean;
    };
    // 
    disableFarView: {
        scale: number;
        withAnimation: boolean;
    };
    // 
    scaleChanged: number;
    //
    systemsLoaded: undefined;
    //
    systemHoverChanged: System | null;
    //
    systemSelectionChanged: System | null;
    //
    toggleCategoryFilter: string;
}

export class ED3DMap {
    private tweens: Tween<any>[] = [];
    public camera: PerspectiveCamera;
    private starField: Points;
    private scene: Scene;
    private renderer: WebGLRenderer;
    private plane: Mesh;
    private light: HemisphereLight;
    private controls: OrbitControls.OrbitControls;
    private raycaster: Raycaster;
    private grid1H: GridHelper;
    private grid1K: GridHelper;
    private grid1XL: GridHelper;
    private coordinatesGridText: Mesh | null = null;
    private coordinatesText: string | null = null;
    public events = new Emittery<Events>();
    public font: Font | null = null;
    public textures: Textures;
    private systems: System[] = [];
    private farView: boolean = false;
    private fogDensity: number = 0;
    private previousScale = -1;
    public systemCategories: {
        [key: string]: {
            color: string;
            spriteMaterial?: SpriteMaterial;
            active: boolean;
        }
    } = {};
    private stats: Stats;
    private renderRequested: boolean = false;

    public constructor(
        private readonly container: HTMLElement,
        public readonly config: ED3DMapConfiguration
    ) {
        for (const categoryName of Object.keys(this.config.categories)) {
            for (const category of Object.keys(this.config.categories[categoryName])) {
                const categoryConfiguration = this.config.categories[categoryName][category];
                this.systemCategories[category] = {
                    color: categoryConfiguration.color,
                    active: true,
                };
            }
        }

        this.camera = new PerspectiveCamera(45, this.container.offsetWidth / this.container.offsetHeight, 1, 200000);
        if (this.config.startAnimation) {
            this.camera.position.set(-10000, 40000, 50000);
        } else {
            this.camera.position.set(500, 800, 1300);
        }

        this.scene = new Scene();
        this.scene.add(this.camera);

        this.stats = Stats();
        this.stats.dom.style.cssText = 'position:absolute;bottom:0px;left:0px;';
        container.appendChild(this.stats.dom);

        this.textures = new Textures(this);

        // grid
        this.grid1H = new GridHelper(1000000, 10000, 0x111E23, 0x111E23);
        this.scene.add(this.grid1H);
        this.grid1K = new GridHelper(1000000, 1000, 0x22323A, 0x22323A);
        this.scene.add(this.grid1K);
        this.grid1XL = new GridHelper(1000000, 100, 0x22323A, 0x22323A);
        this.scene.add(this.grid1XL);

        //
        this.raycaster = new Raycaster();
        this.raycaster.params.Points!.threshold = 4;

        const planeGeometry = new PlaneGeometry(1000, 1000);
        planeGeometry.rotateX(- Math.PI / 2);

        const material = new MeshBasicMaterial({ visible: false });
        this.textures.disposeMaterialWhenDestroyed(material);

        this.plane = new Mesh(planeGeometry, material);
        this.scene.add(this.plane);

        // lights
        this.light = new HemisphereLight(0xffffff, 0xcccccc);
        this.light.position.set(-0.2, 0.5, 0.8).normalize();
        this.scene.add(this.light);

        const directionalLight = new DirectionalLight(0xffffff);
        directionalLight.position.set(1, 0.75, 0.5).normalize();
        this.scene.add(directionalLight);

        this.renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        // this.renderer.setPixelRatio(window.devicePixelRatio);
        // this.renderer.setSize(window.innerWidth, window.innerHeight);
        // this.renderer.sortObjects = false
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls.OrbitControls(this.camera, this.container);
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 2.0;
        this.controls.panSpeed = 100;
        this.controls.keyPanSpeed = 100;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 60000;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = false;
        this.controls.addEventListener("change", () => {
            this.requestRender();
        });
        // this.controls.dampingFactor = 0.3;

        const sizeStars = 10000;

        const vertices = [];
        for (let p = 0; p < 5; p++) {
            const x = Math.random() * sizeStars - (sizeStars / 2);
            const y = Math.random() * sizeStars - (sizeStars / 2);
            const z = Math.random() * sizeStars - (sizeStars / 2);
            vertices.push(x, y, z);
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

        const particleMaterial = new PointsMaterial({
            color: 0xeeeeee,
            size: 20,
        });
        this.textures.disposeMaterialWhenDestroyed(particleMaterial);

        this.starField = new Points(geometry, particleMaterial);
        this.scene.add(this.starField);

        // Add Fog
        this.scene.fog = new FogExp2(0x0D0D10, 0.000128);
        this.renderer.setClearColor(this.scene.fog.color, 1);
        this.fogDensity = (this.scene.fog as FogExp2).density;

        new Galaxy(this);
        new Action(this);
        new HUD(this);
        new GalaxySystem(this);

        this.events.on("loadAssetsCache", async () => {
            const loader = new FontLoader();
            this.font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json');
        });
        this.events.on("scaleChanged", async (scale: number) => {
            await this.scaleChanged(scale);
        });
        this.events.on("systemSelectionChanged", (system: System | null) => {
            if (system) {
                this.setCameraPositionToSystem(system);
            }
        });
        this.events.on("toggleCategoryFilter", async (categoryName: string) => {
            await this.toggleCategoryFilter(categoryName);
        });
        this.events.on("configChanged", () => {
            this.requestRender();
        });
    }

    public async start(): Promise<void> {
        console.log("loadAssetsCache");
        await this.events.emit("loadAssetsCache");
        console.log("loadAssetsCache done");
        await this.events.emit("init");
        console.log("init done");

        await this.updateSystems(this.config.systems);

        this.scene.add(this.setCoordinatesText("Coordinates", 0, 0, 0));

        //
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        this.setCameraPosition(0, -150, 0, 500, this.config.startAnimation);

        this.camera.lookAt(0, 0, 0);

        this.render();
        await this.events.emit("ready");
    }

    public async updateSystems(systems: SystemConfiguration[]): Promise<void> {
        this.config.systems = systems;

        this.scene.remove(...this.scene.children.filter(c => c instanceof SystemPoint || c instanceof SystemSprite));

        this.systems = this.systems.filter(s => s.permanent);
        if (this.config.systems) {
            for (const system of this.config.systems) {
                new System(this, system);
            }
        }

        for (const system of this.systems) {
            let spriteMaterial = this.textures.glow1;
            if (system.configuration.categories?.length) {
                const category = system.configuration.categories[0];
                if (this.systemCategories[category]) {
                    const systemCategoryColor = this.systemCategories[category];
                    if (!systemCategoryColor.spriteMaterial) {
                        systemCategoryColor.spriteMaterial = new SpriteMaterial({
                            map: this.textures.flareYellow,
                            transparent: true,
                            fog: false,
                            blending: AdditiveBlending,
                            color: new Color("#" + systemCategoryColor.color),
                            opacity: 0.8,
                        });
                    }
                    spriteMaterial = systemCategoryColor.spriteMaterial;
                }
            }
            const sprite = new SystemSprite(system, spriteMaterial);
            sprite.position.set(system.x, system.y, system.z);
            sprite.scale.set(16, 16, 1.0);

            this.scene.add(sprite);
            const vertices = [0, 0, 0];
            const geometry = new BufferGeometry();
            geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

            const particle = new SystemPoint(system, sprite, geometry, this.textures.systemPointMaterial);
            particle.position.set(system.x, system.y, system.z);
            this.scene.add(particle);
            if (system.children) {
                for (const child of system.children) {
                    particle.add(child);
                }
            }
            system.systemPoint = particle;
        }

        await this.events.emit("systemsLoaded");

        this.requestRender();
    }

    private async toggleCategoryFilter(categoryName: string): Promise<void> {
        const active = this.systemCategories[categoryName].active;
        const material = active ? this.systemCategories[categoryName].spriteMaterial : this.textures.systemSpriteDisabled;
        if (!material) {
            return;
        }
        for (const object3d of this.scene.children) {
            if (object3d instanceof SystemPoint && object3d.system.configuration.categories?.includes(categoryName)) {
                if (this.config.hideFilteredSystems) {
                    object3d.sprite.visible = active;
                }
                else {
                    object3d.sprite.material = material;
                }
            }
        }
        this.requestRender();
    }

    public requestRender(): void {
        this.renderRequested = true;
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.render();
    }

    private setCoordinatesText(text: string, x: number, y: number, z: number): Mesh {
        const textShapes = this.font!.generateShapes(text, 5);
        const textGeo = new THREE.ShapeGeometry(textShapes);
        if (this.coordinatesGridText) {
            this.coordinatesGridText.geometry.dispose();
            this.coordinatesGridText.geometry = textGeo;
        }
        else {
            this.coordinatesGridText = new THREE.Mesh(textGeo, this.textures.darkBlue);
        }

        const center = textGeo.center();
        const boundingBox = center.boundingBox;
        if (boundingBox) {
            this.coordinatesGridText.position.set(x - boundingBox.max.x - 4, y, z + boundingBox.max.y + 4);
        }
        this.coordinatesGridText.rotation.x = -Math.PI / 2;
        return this.coordinatesGridText;
    }

    public appendToContainer(element: HTMLElement): void {
        this.container.appendChild(element);
    }

    public getTweenInstance(_object: any): Tween<any> {
        const tween = new Tween(_object)
            .onComplete(() => {
                this.tweens = this.tweens.filter(t => t !== tween);
            });
        this.tweens.push(tween);
        return tween;
    }

    private async render(time?: number): Promise<void> {
        try {
            const distance = this.distanceFromTarget(this.camera);
            const scale = distance / 200;

            this.stats.update();

            const renderData = {
                time: time,
                render: false,
            };

            await this.events.emit("render", renderData);

            for (const tween of this.tweens) {
                if (tween.update(time)) {
                    renderData.render = true;
                }
            }

            if (this.previousScale != scale) {
                this.previousScale = scale;
                await this.events.emit("scaleChanged", scale);
                renderData.render = true;
            }

            this.starField.position.set(
                this.controls.target.x - (this.controls.target.x / 10) % 4000,
                this.controls.target.y - (this.controls.target.y / 10) % 4000,
                this.controls.target.z - (this.controls.target.z / 10) % 4000
            );

            if (this.coordinatesGridText) {
                const size = 100;
                const distanceToGrid = Math.abs(this.camera.position.y - this.grid1H.position.y);

                if (distanceToGrid > size * 10 || distanceToGrid < size) {
                    this.coordinatesGridText.visible = false;
                }
                else {
                    this.coordinatesGridText.visible = true;

                    const posX = Math.ceil(this.controls.target.x / size) * size;
                    const posZ = Math.ceil(this.controls.target.z / size) * size;
                    const textCoords = posX + ' : ' + this.grid1H.position.y + ' : ' + (-posZ);

                    // If same coords as previously, return.
                    if (this.coordinatesText !== textCoords) {
                        this.coordinatesText = textCoords;

                        // Generate a new text shape
                        this.setCoordinatesText(textCoords, posX, this.grid1H.position.y, posZ);
                        renderData.render = true;
                    }
                }
            }
            this.controls.update();
            if (this.renderRequested) {
                this.renderRequested = false;
                renderData.render = true;
            }
            if (renderData.render) {
                this.renderer.render(this.scene, this.camera);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            requestAnimationFrame((time?: number) => { this.render(time); });
        }
    }

    private async scaleChanged(scale: number): Promise<void> {
        if (scale >= 25) {
            await this.enableFarView(scale);

        } else {
            await this.disableFarView(scale);
        }
    }

    public addToScene(...object: Object3D[]): void {
        this.scene.add(...object);
    }

    public setCameraPosition(x: number, y: number, z: number, distance: number, withAnimation: boolean = true): void {
        this.disableControls();
        // If in far view reset to classic view
        this.disableFarView(25, false);
        const moveTo = {
            x: x, y: y + distance, z: z + distance,
            mx: x, my: y, mz: z
        };

        if (withAnimation) {
            // this.Ed3d.HUD.setInfoPanel(index, obj);
            // if (obj.infos != undefined) this.Ed3d.HUD.openHudDetails();

            // Move camera to target (Smooth move using Tween)
            const moveFrom = {
                x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z,
                mx: this.controls.target.x, my: this.controls.target.y, mz: this.controls.target.z
            };

            this.getTweenInstance(moveFrom)
                .to(moveTo, 1200)
                .start()
                .onUpdate(() => {
                    this.camera.position.set(moveFrom.x, moveFrom.y, moveFrom.z);
                    this.controls.target.set(moveFrom.mx, moveFrom.my, moveFrom.mz);
                })
                .onComplete(() => {
                    this.controls.update();
                });

            // 3D Cursor on selected object

            // this.addCursorOnSelect(goX, goY, goZ);
        }
        else {
            this.camera.position.set(moveTo.x, moveTo.y, moveTo.z);
            this.controls.target.set(moveTo.mx, moveTo.my, moveTo.mz);
        }
        this.enableControls();
    }

    public setCameraPositionToSystem(system: System, withAnimation: boolean = true) {
        this.setCameraPosition(system.x, system.y, system.z, 50, withAnimation);
    }

    public enableControls(): void {
        this.controls.enabled = true;
    }

    public disableControls(): void {
        this.controls.enabled = false;
    }

    public get controlsEnabled(): boolean {
        return this.controls.enabled;
    }

    public raycasterIntersectObjects(coords: { x: number; y: number }): Intersection<Object3D<THREE.Event>>[] {
        this.raycaster.setFromCamera(coords, this.camera);
        return this.raycaster.intersectObjects(this.scene.children, false);
    }

    public addSystem(system: System): void {
        if (!this.systems.includes(system)) {
            this.systems.push(system);
        }
    }

    public findSystemByName(systemName: string, exact: boolean = true, visibleOnly: boolean = true): System | undefined {
        if (exact) {
            return this.systems.find(s => s.configuration.name === systemName && (!visibleOnly || s.isVisible));
        }
        const name = systemName.trim().toUpperCase();
        return this.systems.find(s => s.configuration.name === name && (!visibleOnly || s.isVisible));
    }

    private distanceFromTarget(object3D: Object3D) {
        const dx = Math.abs(object3D.position.x - this.controls.target.x);
        const dy = Math.abs(object3D.position.y - this.controls.target.y);
        const dz = Math.abs(object3D.position.z - this.controls.target.z);
        return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }

    private async enableFarView(scale: number, withAnimation: boolean = true): Promise<void> {
        if (this.farView) {
            return;
        }
        this.farView = true;
        await this.events.emit("enableFarView", { scale: scale, withAnimation: withAnimation });

        // this.Galaxy.obj.scale.set(20,20,20);

        this.grid1H.visible = false;
        this.grid1K.visible = false;
        this.grid1XL.visible = true;
        this.starField.visible = false;
        if (this.scene.fog instanceof FogExp2) {
            this.scene.fog.density = 0.000009;
        }
    }

    private async disableFarView(scale: number, withAnimation: boolean = true): Promise<void> {
        if (!this.farView) {
            return;
        }
        this.farView = false;

        await this.events.emit("disableFarView", { scale: scale, withAnimation: withAnimation });

        this.camera.scale.set(1, 1, 1);

        this.grid1H.visible = true;
        this.grid1K.visible = true;
        this.grid1XL.visible = false;
        this.starField.visible = true;
        if (this.scene.fog instanceof FogExp2) {
            this.scene.fog.density = this.fogDensity;
        }
    }

    public get isFarViewEnabled(): boolean {
        return this.farView;
    }
}

interface ED3DMapConfiguration {
    showGalaxyInfos: boolean;
    startAnimation: boolean;
    systems: SystemConfiguration[];
    categories: {
        [key: string]: {
            [key: string]: SystemCategory;
        };
    };
    hideFilteredSystems: boolean;
    withOptionsPanel: boolean;
    withHudPanel: boolean;
    showSystemSearch: boolean;
}

interface SystemCategory {
    name: string;
    color: string;
}

export class SystemMesh extends Mesh {
    public clickable: boolean = true;
    public spriteId: number | undefined;
}

export class SystemPoint<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material | Material[] = Material | Material[],
> extends Points {
    public constructor(
        public readonly system: System,
        public sprite: Sprite,
        geometry?: TGeometry,
        material?: TMaterial) {
        super(geometry, material);
    }
}

export class SystemSprite extends Sprite {
    public constructor(
        public readonly system: System,
        material?: SpriteMaterial) {
        super(material);
    }
}

export interface RenderData {
    time?: number;
    render: boolean;
}