import * as THREE from 'three';
import { Object3D } from 'three';
import { ED3DMap } from './ED3DMap';

export class Galaxy {
  private x = 25;
  private y = -21;
  private z = 25900;
  private infos: Object3D | null = null;

  public constructor(
    private readonly ED3DMap: ED3DMap
  ) {

  }

  public async init(): Promise<void> {
    this.add2DPlane();
    await this.addGalaxyInfos();
  }

  private add2DPlane() {
    const texloader = new THREE.TextureLoader();

    //-- Load textures
    const back2D = texloader.load("textures/heightmap7.jpg");
    const floorMaterial = new THREE.MeshBasicMaterial({
      map: back2D,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const floorGeometry = new THREE.PlaneGeometry(104000, 104000, 1, 1);
    const milkyway2D = new THREE.Mesh(floorGeometry, floorMaterial);
    milkyway2D.position.set(this.x, this.y, -this.z);
    milkyway2D.rotation.x = -Math.PI / 2;
    // milkyway2D.showCoord = true;

    this.ED3DMap.scene.add(milkyway2D);
  }

  private async addGalaxyInfos(): Promise<void> {
    if (!this.ED3DMap.config.showGalaxyInfos) {
      return;
    }

    this.infos = new THREE.Object3D();

    const milkywayDataQuery = await fetch("data/milkyway-ed.json");
    if (milkywayDataQuery.status === 200) {
      const milkywayData = await milkywayDataQuery.json() as MilkywayData;
      for (const quadrantName in milkywayData.quadrants) {
        const quadrant = milkywayData.quadrants[quadrantName];
        this.addText(quadrantName, quadrant.x, -100, quadrant.z, quadrant.rotate);
      }
      for (const armName in milkywayData.arms) {
        for (const armCoords of milkywayData.arms[armName]) {
          this.addText(armName, armCoords.x, 0, armCoords.z, armCoords.rotate, 300, true);
        }
      }
      for (const gapName in milkywayData.gaps) {
        for (const gapCoords of milkywayData.gaps[gapName]) {
          this.addText(gapName, gapCoords.x, 0, gapCoords.z, gapCoords.rotate, 160, true);
        }
      }
      for (const otherName in milkywayData.others) {
        for (const otherCoords of milkywayData.others[otherName]) {
          this.addText(otherName, otherCoords.x, 0, otherCoords.z, otherCoords.rotate, 160, true);
        }
      }
    }

    this.ED3DMap.scene.add(this.infos);
  }

  public addText(text: string, x: number, y: number, z: number, rotation: number, size = 450, revert = false) {
    const shapes = this.ED3DMap.font!.generateShapes(text.toUpperCase(), size);
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    const xMid = - 0.5 * (geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
    geometry.translate(xMid, 0, 0);

    const textMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0x999999,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.ED3DMap.scene.add(textMesh);

    // x -= Math.round(textShow.length*400/2);
    const middleTxt = Math.round(size / 2);
    z -= middleTxt;

    textMesh.rotation.x = -Math.PI / 2;
    geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-Math.round(text.length * size / 2), 0, -middleTxt));
    if (rotation) {
      textMesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI * (rotation) / 180);
    }
    textMesh.position.set(x, y, -z);

    // textMesh.revert = revert;

    this.infos!.add(textMesh);
  }
}

interface MilkywayData {
  quadrants: {
    [key: string]: {
      x: number;
      z: number;
      rotate: number;
    };
  };
  arms: {
    [key: string]: {
      x: number;
      z: number;
      rotate: number;
    }[];
  };
  gaps: {
    [key: string]: {
      x: number;
      z: number;
      rotate: number;
    }[];
  };
  others: {
    [key: string]: {
      x: number;
      z: number;
      rotate: number;
    }[];
  };
}