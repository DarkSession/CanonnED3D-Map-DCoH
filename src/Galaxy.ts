import * as THREE from 'three';
import { Material, Object3D, PointsMaterial } from 'three';
import { ED3DMap, RenderData } from './ED3DMap';
import { System } from './System';

export class Galaxy {
  private x = 25;
  private y = -21;
  private z = 25900;
  private infos: Object3D | null = null;
  private galaxyCenter: System | null = null;
  private particlePointsSmall: THREE.Points | null = null;
  private particlePointsLarge: THREE.Points | null = null;
  private milkyway2D: THREE.Mesh | null = null;

  public constructor(
    private readonly ED3DMap: ED3DMap
  ) {
    this.ED3DMap.events.on("init", async () => {
      await this.init();
    });
    this.ED3DMap.events.on("enableFarView", eventData => {
      this.enableFarView(eventData.scale, eventData.withAnimation);
    });
    this.ED3DMap.events.on("disableFarView", eventData => {
      this.disableFarView(eventData.scale, eventData.withAnimation);
    });
    this.ED3DMap.events.on("scaleChanged", (scale: number) => {
      this.scaleChanged(scale);
    });
  }

  private scaleChanged(scale: number): void {
    if (this.ED3DMap.config.showGalaxyInfos && this.infos !== null) {
      const scaleInternal = scale - 70;
      let opacity = Math.round(scaleInternal / 10) / 10;
      if (opacity < 0) {
        opacity = 0;
      }
      else if (opacity > 0.8) {
        opacity = 0.8;
      }

      let opacityMiddle = 1.1 - opacity;
      if (opacityMiddle <= 0.4) {
        opacityMiddle = 0.2;
      }

      for (const txt of this.infos.children) {
        if (txt instanceof GalaxyMapTextMesh) {
          this.materialChangeOpacity(txt.material, (!txt.revert) ? opacity : opacityMiddle);
        }
      }
    }

    if (this.ED3DMap.isFarViewEnabled && this.milkyway2D) {
      let milkyway2DOpacity = 0;
      if (scale >= 25 && scale < 50) {
        milkyway2DOpacity = (scale - 25) / 25 * 0.4;
      }
      else if (scale >= 50) {
        milkyway2DOpacity = 0.4;
      }
      this.materialChangeOpacity(this.milkyway2D.material, milkyway2DOpacity);
    }
  }

  private async init(): Promise<void> {
    this.galaxyCenter = new System(this.ED3DMap, {
      name: 'Sagittarius A*',
      coordinates: { x: this.y, y: this.y, z: this.z },
      categories: [],
    });

    const sprite = new THREE.Sprite(this.ED3DMap.textures.glow2);
    sprite.scale.set(50, 40, 2.0);
    this.galaxyCenter.add(sprite); /// this centers the glow at the mesh

    this.createParticles();
    this.add2DPlane();
    await this.addOrShowGalaxyInformation();
  }

  private add2DPlane() {
    const heightMapMaterial = new THREE.MeshBasicMaterial({
      map: this.ED3DMap.textures.heightmap,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ED3DMap.textures.disposeMaterialWhenDestroyed(heightMapMaterial);
    const floorGeometry = new THREE.PlaneGeometry(104000, 104000, 1, 1);
    this.milkyway2D = new THREE.Mesh(floorGeometry, heightMapMaterial);
    this.milkyway2D.position.set(this.x, this.y, -this.z);
    this.milkyway2D.rotation.x = -Math.PI / 2;
    this.milkyway2D.visible = this.ED3DMap.isFarViewEnabled;
    // milkyway2D.showCoord = true;

    this.ED3DMap.addToScene(this.milkyway2D);
  }

  private createParticles() {
    const imageWidth = this.ED3DMap.textures.heightmap.image.width;
    const imageHeight = this.ED3DMap.textures.heightmap.image.height;

    // Get pixels from milkyway image
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error("Unable to create particle 2d context");
    }
    context.drawImage(this.ED3DMap.textures.heightmap.image, 0, 0);
    // const size = imageWidth * imageHeight;
    const imgd = context.getImageData(0, 0, imageWidth, imageHeight);
    const pix = imgd.data;

    // Build galaxy from image data
    const min = 8;
    const maxDensity = 15;

    const scaleImg = 21;

    const colorsLarge = [];
    const colorsSmall = [];

    const particleLargeVertices = [];
    const particleSmallVertices = [];

    for (let i = 0; i < pix.length; i += 20) {
      if (Math.random() > 0.5) {
        i += 8;
      }
      // const all = pix[i] + pix[i + 1] + pix[i + 2];
      const avg = Math.round((pix[i] + pix[i + 1] + pix[i + 2]) / 3);
      if (avg > min) {
        const x = scaleImg * ((i / 4) % imageWidth);
        const z = scaleImg * (Math.floor((i / 4) / imageHeight));
        let density = Math.floor((pix[i] - min) / 10);
        if (density > maxDensity) {
          density = maxDensity;
        }
        const add = Math.ceil(density / maxDensity * 2);
        for (let y = -density; y < density; y = y + add) {
          const particleX = x + ((Math.random() - 0.5) * 25);
          const particleY = (y * 10) + ((Math.random() - 0.5) * 50);
          const particleZ = z + ((Math.random() - 0.5) * 25);

          // Particle color from pixel
          const r = Math.round(pix[i]);
          const g = Math.round(pix[i + 1]);
          const b = Math.round(pix[i + 2]);

          // Big particle
          if (density >= 2 && Math.abs(y) - 1 == 0 && Math.random() * 1000 < 200) {
            particleLargeVertices.push(particleX, particleY, particleZ);
            colorsLarge.push(r, g, b);
            // Small particle
          } else if (density < 4 || (Math.random() * 1000 < 400 - (density * 2))) {
            particleSmallVertices.push(particleX, particleY, particleZ);
            colorsSmall.push(r, g, b);
          }
        };
      }
    }

    canvas.remove();
    {
      // Create small particles milkyway
      const particlesSmall = new THREE.BufferGeometry();
      particlesSmall.setAttribute('position', new THREE.Float32BufferAttribute(particleSmallVertices, 3));
      particlesSmall.setAttribute('color', new THREE.Float32BufferAttribute(colorsSmall, 3));

      const systemPointSmallMaterial = new THREE.PointsMaterial({
        map: this.ED3DMap.textures.flareYellow,
        transparent: true,
        size: 16,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
      });
      this.ED3DMap.textures.disposeMaterialWhenDestroyed(systemPointSmallMaterial);

      this.particlePointsSmall = new THREE.Points(particlesSmall, systemPointSmallMaterial);
      particlesSmall.center();
      this.particlePointsSmall.scale.set(20, 20, 20);
      this.galaxyCenter?.add(this.particlePointsSmall);
    }
    {
      // Create big particles milkyway
      const particlesLarge = new THREE.BufferGeometry();
      particlesLarge.setAttribute('position', new THREE.Float32BufferAttribute(particleLargeVertices, 3));
      particlesLarge.setAttribute('color', new THREE.Float32BufferAttribute(colorsLarge, 3));

      const systemPointBigMaterial = new THREE.PointsMaterial({
        map: this.ED3DMap.textures.flareYellow,
        transparent: true,
        size: 16,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
      });
      this.ED3DMap.textures.disposeMaterialWhenDestroyed(systemPointBigMaterial);

      this.particlePointsLarge = new THREE.Points(particlesLarge, systemPointBigMaterial);
      particlesLarge.center();
      this.particlePointsLarge.scale.set(20, 20, 20);
      this.galaxyCenter?.add(this.particlePointsLarge);
    }
  }

  private async addOrShowGalaxyInformation(): Promise<void> {
    if (!this.ED3DMap.config.showGalaxyInfos) {
      return;
    }
    else if (this.infos) {
      this.infos.visible = true;
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

    this.ED3DMap.addToScene(this.infos);
  }

  public addText(text: string, x: number, y: number, z: number, rotation: number, size = 450, revert = false) {
    const shapes = this.ED3DMap.font!.generateShapes(text.toUpperCase(), size);
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    const xMid = - 0.5 * (geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
    geometry.translate(xMid, 0, 0);

    const galaxyInfoTextMaterial = new THREE.MeshBasicMaterial({
      color: 0x999999,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.ED3DMap.textures.disposeMaterialWhenDestroyed(galaxyInfoTextMaterial);

    const textMesh = new GalaxyMapTextMesh(geometry, galaxyInfoTextMaterial);
    this.ED3DMap.addToScene(textMesh);

    // x -= Math.round(textShow.length*400/2);
    const middleTxt = Math.round(size / 2);
    z -= middleTxt;

    textMesh.rotation.x = -Math.PI / 2;
    geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-Math.round(text.length * size / 2), 0, -middleTxt));
    if (rotation) {
      textMesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI * (rotation) / 180);
    }
    textMesh.position.set(x, y, -z);
    textMesh.revert = revert;

    this.infos!.add(textMesh);
  }

  private async enableFarView(scale: number, withAnimation: boolean): Promise<void> {
    // Scale change animation
    const scaleTo = {
      zoom: 400,
      opacity: 1,
    };
    if (this.particlePointsSmall && this.particlePointsLarge) {
      if (withAnimation) {
        const scaleFrom = {
          zoom: 25,
          opacity: 0.5,
        };
        // controls.enabled = false;
        this.ED3DMap.getTweenInstance(scaleFrom)
          .to(scaleTo, 500)
          .start()
          .onUpdate(() => {
            this.materialChangeSize(this.particlePointsSmall!.material, scaleFrom.zoom);
            this.materialChangeSize(this.particlePointsLarge!.material, scaleFrom.zoom * 4);
            this.materialChangeOpacity(this.particlePointsSmall!.material, scaleFrom.opacity);
            this.materialChangeOpacity(this.particlePointsLarge!.material, scaleFrom.opacity);
          });
      } else {
        this.materialChangeSize(this.particlePointsSmall.material, scaleTo.zoom);
        this.materialChangeSize(this.particlePointsLarge.material, scaleTo.zoom * 4);
        this.materialChangeOpacity(this.particlePointsSmall!.material, scaleTo.opacity);
        this.materialChangeOpacity(this.particlePointsLarge!.material, scaleTo.opacity);
      }
    }

    // Enable 2D galaxy
    if (this.milkyway2D && this.particlePointsSmall) {
      this.milkyway2D.visible = this.particlePointsSmall.visible;
    }
    await this.addOrShowGalaxyInformation();
  }

  private async disableFarView(scale: number, withAnimation: boolean): Promise<void> {
    // Scale change animation
    const scaleTo = {
      zoom: 25,
      opacity: 0.5,
    };
    if (this.particlePointsSmall && this.particlePointsLarge) {
      if (withAnimation) {
        const scaleFrom = {
          zoom: 400,
          opacity: 1,
        };
        // controls.enabled = false;
        this.ED3DMap.getTweenInstance(scaleFrom)
          .to(scaleTo, 500)
          .start()
          .onUpdate(() => {
            this.materialChangeSize(this.particlePointsSmall!.material, scaleFrom.zoom);
            this.materialChangeSize(this.particlePointsLarge!.material, scaleFrom.zoom);
            this.materialChangeOpacity(this.particlePointsSmall!.material, scaleFrom.opacity);
            this.materialChangeOpacity(this.particlePointsLarge!.material, scaleFrom.opacity);
          });
      } else {
        this.materialChangeSize(this.particlePointsSmall.material, scaleTo.zoom);
        this.materialChangeSize(this.particlePointsLarge.material, scaleTo.zoom);
        this.materialChangeOpacity(this.particlePointsSmall!.material, scaleTo.opacity);
        this.materialChangeOpacity(this.particlePointsLarge!.material, scaleTo.opacity);
      }
    }

    // Disable 2D galaxy
    if (this.milkyway2D) {
      this.milkyway2D.visible = false;
    }
    this.hideGalaxyInformation();
  }

  private materialChangeSize(materials: Material | Material[], size: number): void {
    if (Array.isArray(materials)) {
      for (const material of materials) {
        if (material instanceof PointsMaterial) {
          material.size = size;
        }
      }
    }
    else if (materials instanceof PointsMaterial) {
      materials.size = size;
    }
  }

  private materialChangeOpacity(materials: Material | Material[], opacity: number): void {
    if (Array.isArray(materials)) {
      for (const material of materials) {
        material.opacity = opacity;
      }
    }
    else {
      materials.opacity = opacity;
    }
  }

  /**
   * Show additional galaxy infos
   */
  private hideGalaxyInformation() {
    if (this.infos !== null) {
      this.infos.visible = false;
    }
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

class GalaxyMapTextMesh extends THREE.Mesh {
  public revert: boolean = false;
}