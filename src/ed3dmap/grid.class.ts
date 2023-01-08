
import * as THREE from 'three';
import { Ed3d } from './ed3dmap';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry, TextGeometryParameters } from 'three/examples/jsm/geometries/TextGeometry.js';

export class Grid {
  obj = null;
  size = null;
  coordTxt = null;
  minDistView = null;
  visible = true;
  fixed = false;
  coordGrid = null;

  /**
   * Create 2 base grid scaled on Elite: Dangerous grid
   */

  public constructor(
    private readonly Ed3d: Ed3d,
    size, color, minDistView) {
    this.size = size;

    const gridHelper = new THREE.GridHelper(1000000, size, color, color);
    // gridHelper.minDistView = minDistView;

    this.obj = gridHelper;

    Ed3d.scene.add(gridHelper);

    // gridHelper.customUpdateCallback = this.addCoords;

    return this;
  }

  /**
   * Create 2 base grid scaled on Elite: Dangerous grid
   */

  public infos(step, color, minDistView) {
    var size = 50000;
    if (step == undefined) step = 10000;
    this.fixed = true;

    {
      //-- Add global grid
      const vertices = [];
      for (var i = - size; i <= size; i += step) {
        {
          const x = - size;
          const y = 0;
          const z = i;
          vertices.push(x, y, z);
        }
        {
          const x = size;
          const y = 0;
          const z = i;
          vertices.push(x, y, z);
        }
        {
          const x = i;
          const y = 0;
          const z = - size;
          vertices.push(x, y, z);
        }
        {
          const x = i;
          const y = 0;
          const z = size;
          vertices.push(x, y, z);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

      var material = new THREE.LineBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.obj = new THREE.LineSegments(geometry, material);
      this.obj.position.set(0, 0, -20000);
    }
    {
      //-- Add quadrant

      var material = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const vertices = [];
      {
        const x = - size;
        const y = 0;
        const z = 20000;
        vertices.push(x, y, z);
      }
      {
        const x = size;
        const y = 0;
        const z = 20000;
        vertices.push(x, y, z);
      }
      {
        const x = 0;
        const y = 0;
        const z = - size;
        vertices.push(x, y, z);
      }
      {
        const x = 0;
        const y = 0;
        const z = size;
        vertices.push(x, y, z);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

      var quadrantL = new THREE.LineSegments(geometry, material);

      this.obj.add(quadrantL);
    }
    //-- Add grid to the scene

    scene.add(this.obj);

    return this;
  }

  public async addCoords() {
    var textShow = '0 : 0 : 0';
    const loader = new FontLoader();
    const font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json');

    const options: TextGeometryParameters = {
      font: font,
      size: this.size / 20,
      height: 5,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 10,
      bevelSize: 8,
      bevelOffset: 0,
      bevelSegments: 5,
    };

    if (this.coordGrid != null) {

      if (
        Math.abs(this.Ed3d.camera.position.y - this.obj.position.y) > this.size * 10
        || Math.abs(this.Ed3d.camera.position.y - this.obj.position.y) < this.obj.minDistView
      ) {
        this.coordGrid.visible = false;
        return;
      }
      this.coordGrid.visible = true;

      var posX = Math.ceil(this.Ed3d.controls.target.x / this.size) * this.size;
      var posZ = Math.ceil(this.Ed3d.controls.target.z / this.size) * this.size;

      var textCoords = posX + ' : ' + this.obj.position.y + ' : ' + (-posZ);

      //-- If same coords as previously, return.
      if (this.coordTxt == textCoords) return;
      this.coordTxt = textCoords;

      //-- Generate a new text shape
      const geometry = new TextGeometry(this.coordTxt, options);

      var center = geometry.center();
      //this.coordGrid.position.set(center.x + posX - (this.size / 100), this.obj.position.y, center.z + posZ + (this.size / 30));

      this.coordGrid.geometry = geometry;
      this.coordGrid.geometry.needsUpdate = true;

    } else {

      const geometry = new TextGeometry(this.coordTxt, options);
      this.coordGrid = new THREE.Mesh(geometry, this.Ed3d.material.darkblue);
      this.coordGrid.position.set(this.obj.position.x, this.obj.position.y, this.obj.position.z);
      this.coordGrid.rotation.x = -Math.PI / 2;

      this.Ed3d.scene.add(this.coordGrid);
    }
  }

  /**
   * Toggle grid view
   */
  public toggleGrid() {
    this.visible = !this.visible;

    if (this.size < 10000 && this.Ed3d.isFarView)
      return;
    this.obj.visible = this.visible;
  }

  /**
   * Show grid
   */
  public show() {
    if (!this.visible) {
      return;
    }
    this.obj.visible = true;
  }

  /**
   * Hide grid
   */
  public hide() {
    this.obj.visible = false;
  }
}