import { Object3D } from 'three';
import { ED3DMap } from './ED3DMap';

export class System {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;
    public children: Object3D[] = [];

    public constructor(
        private readonly ED3DMap: ED3DMap,
        public readonly configuration: SystemConfiguration
    ) {
        this.x = configuration.coordinates.x;
        this.y = configuration.coordinates.y;
        this.z = -configuration.coordinates.z; //-- Revert Z coord

        this.ED3DMap.addSystem(this);
    }

    public add(object3d: Object3D): void {
        this.children.push(object3d);
    }
}

export interface SystemConfiguration {
    name: string;
    description?: string;
    coordinates: SystemCoordinates,
    categories?: string[];
}

export interface SystemCoordinates {
    x: number;
    y: number;
    z: number;
}