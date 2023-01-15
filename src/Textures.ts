
import * as THREE from 'three';
import { Material, MeshBasicMaterial, SpriteMaterial, Texture } from 'three';
import { ED3DMap } from './ED3DMap';

export class Textures {
    public heightmap!: Texture;
    public flareYellow!: Texture;
    public flareWhite!: Texture;

    public glow1!: SpriteMaterial;
    public glow2!: SpriteMaterial;
    public white: MeshBasicMaterial;
    public gray: THREE.MeshPhongMaterial;
    public black: THREE.MeshBasicMaterial;
    public darkBlue: THREE.MeshBasicMaterial;
    public selected: THREE.MeshPhongMaterial;

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
        this.white = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });
        this.gray = new THREE.MeshPhongMaterial({
            color: 0x7EA0A0
        });
        this.black = new THREE.MeshBasicMaterial({
            color: 0x010101
        });
        this.darkBlue = new THREE.MeshBasicMaterial({
            color: 0x16292B
        });
        this.selected = new THREE.MeshPhongMaterial({
            color: 0x0DFFFF
        });
    }

    private async destroy(): Promise<void> {
        this.heightmap.dispose();
        this.flareWhite.dispose();
        this.flareYellow.dispose();
        this.glow1.dispose();
        this.glow2.dispose();
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

        this.glow1 = new THREE.SpriteMaterial({
            map: this.flareYellow,
            color: 0xffffff,
            transparent: true,
            fog: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.glow2 = new THREE.SpriteMaterial({
            map: this.flareWhite,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: true,
            opacity: 0.5,
        });
        console.log("Textures loaded.");
    }
}