
import * as THREE from 'three';
import { Texture } from 'three';


export class Textures {
    public heightmap!: Texture;

    public async loadTextures(): Promise<void> {
        const texloader = new THREE.TextureLoader();

        this.heightmap = await texloader.loadAsync("textures/heightmap7.jpg");
    }
}