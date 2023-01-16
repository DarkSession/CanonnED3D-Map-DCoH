
import * as THREE from 'three';
import { AdditiveBlending, Material, MeshBasicMaterial, MeshPhongMaterial, PointsMaterial, SpriteMaterial, Texture } from 'three';
import { ED3DMap } from './ED3DMap';

export class Textures {
    public heightmap!: Texture;
    public flareYellow!: Texture;
    public flareWhite!: Texture;

    public glow1!: SpriteMaterial;
    public glow2!: SpriteMaterial;
    public systemSpriteDisabled!: SpriteMaterial;
    public white: MeshBasicMaterial;
    public gray: MeshPhongMaterial;
    public black: MeshBasicMaterial;
    public darkBlue: MeshBasicMaterial;
    public selected: MeshPhongMaterial;
    public systemPointMaterial!: PointsMaterial;
    private materialDisposeList: Material[] = [];

    public constructor(
        private readonly ED3DMap: ED3DMap
    ) {
        this.ED3DMap.events.on("loadAssetsCache", async () => {
            await this.loadTextures();
        });
        this.ED3DMap.events.on("destroy", () => {
            this.destroy();
        });
        this.white = new MeshBasicMaterial({
            color: 0xffffff
        });
        this.gray = new MeshPhongMaterial({
            color: 0x7EA0A0
        });
        this.black = new MeshBasicMaterial({
            color: 0x010101
        });
        this.darkBlue = new MeshBasicMaterial({
            color: 0x16292B
        });
        this.selected = new MeshPhongMaterial({
            color: 0x0DFFFF
        });
    }

    private async destroy(): Promise<void> {
        this.heightmap.dispose();
        this.flareWhite.dispose();
        this.flareYellow.dispose();
        this.glow1.dispose();
        this.glow2.dispose();
        this.systemSpriteDisabled.dispose();
        this.white.dispose();
        this.gray.dispose();
        this.black.dispose();
        this.darkBlue.dispose();
        this.selected.dispose();
        for (const material of this.materialDisposeList) {
            material.dispose();
        }
        this.materialDisposeList = [];
    }

    public disposeMaterialWhenDestroyed(material: Material): void {
        if (!this.materialDisposeList.includes(material)) {
            this.materialDisposeList.push(material);
        }
    }

    private async loadTextures(): Promise<void> {
        const texloader = new THREE.TextureLoader();
        console.log("Loading textures...");

        // All textures are requested around the same time from the server, instead of one after the other
        // This cuts down the total loading time
        await Promise.all([(async () => {
            this.heightmap = await texloader.loadAsync("textures/heightmap7.jpg");
        })(), (async () => {
            this.flareYellow = await texloader.loadAsync("textures/star_grey2.png");
        })(), (async () => {
            this.flareWhite = await texloader.loadAsync("textures/flare2.png");
        })()]);

        this.glow1 = new SpriteMaterial({
            map: this.flareYellow,
            color: 0xffffff,
            transparent: true,
            fog: true,
            blending: AdditiveBlending,
            depthWrite: false,
        });
        this.glow2 = new SpriteMaterial({
            map: this.flareWhite,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: true,
            opacity: 0.5,
        });
        this.systemSpriteDisabled = new SpriteMaterial({
            map: this.flareYellow,
            transparent: true,
            fog: false,
            blending: AdditiveBlending,
            opacity: 0.1,
        });
        this.systemPointMaterial = new PointsMaterial({
            size: 0,
            fog: false,
            blending: AdditiveBlending,
            color: 0xffffff,
            transparent: true,
            opacity: 0,
        });
        console.log("Textures loaded.");
    }
}