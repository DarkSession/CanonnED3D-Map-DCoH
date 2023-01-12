
import * as THREE from 'three';
import * as OrbitControls from "three/examples/jsm/controls/OrbitControls";
import { GridHelper, HemisphereLight, Mesh, PerspectiveCamera, Raycaster, Scene, WebGLRenderer } from 'three';
import { Emitter } from 'strict-event-emitter'
import { Galaxy } from './Galaxy';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { Textures } from './Textures';

type Events = {
    render: [void],
    ready: [void],
}

export class ED3DMap {
    private camera: PerspectiveCamera;
    public scene: Scene;
    private renderer: WebGLRenderer;
    private plane: Mesh;
    private light: HemisphereLight;
    private controls: OrbitControls.OrbitControls;
    private raycaster: Raycaster;
    private grid1H: GridHelper;
    private grid1K: GridHelper;
    private galaxy: Galaxy;
    public events = new Emitter<Events>();
    public font: Font | null = null;
    public textures: Textures | null = null;

    public constructor(
        private readonly container: HTMLElement,
        public readonly config: ED3DMapConfiguration
    ) {
        this.camera = new THREE.PerspectiveCamera(45, this.container.offsetWidth / this.container.offsetHeight, 1, 100000);
        this.camera.position.set(500, 800, 1300);
        this.camera.lookAt(0, 0, 0);

        this.scene = new THREE.Scene();
        this.scene.add(this.camera);

        // grid
        this.grid1H = new THREE.GridHelper(1000000, 100, 0x111E23, 0x111E23);
        this.scene.add(this.grid1H);
        this.grid1K = new THREE.GridHelper(1000000, 1000, 0x22323A, 0x22323A);
        this.scene.add(this.grid1K);

        const size = 50000;
        const step = 10000;
        {
            //-- Add global grid
            const vertices = [];
            for (let i = - size; i <= size; i += step) {
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

            const material = new THREE.LineBasicMaterial({
                color: 0x555555,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const obj = new THREE.LineSegments(geometry, material);
            obj.position.set(0, 0, -20000);
            this.scene.add(obj);
        }
        {
            //-- Add quadrant
            const material = new THREE.LineBasicMaterial({
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

            const quadrantL = new THREE.LineSegments(geometry, material);

            this.scene.add(quadrantL);
        }

        // const gridHelper = new THREE.GridHelper(1000, 20);
        // this.scene.add(gridHelper);

        //
        this.raycaster = new THREE.Raycaster();

        const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        planeGeometry.rotateX(- Math.PI / 2);

        this.plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ visible: false }));
        this.scene.add(this.plane);

        // lights
        this.light = new THREE.HemisphereLight(0xffffff, 0xcccccc);
        this.light.position.set(-0.2, 0.5, 0.8).normalize();
        this.scene.add(this.light);

        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1, 0.75, 0.5).normalize();
        this.scene.add(directionalLight);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        //this.renderer.setPixelRatio(window.devicePixelRatio);
        /*
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        */
        // this.renderer.sortObjects = false
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls.OrbitControls(this.camera, this.container);
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 2.0;
        this.controls.panSpeed = 0.8;
        this.controls.maxDistance = 60000;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = false;
        this.controls.dampingFactor = 0.3;

        const sizeStars = 10000;

        const vertices = [];
        for (let p = 0; p < 5; p++) {
            const x = Math.random() * sizeStars - (sizeStars / 2);
            const y = Math.random() * sizeStars - (sizeStars / 2);
            const z = Math.random() * sizeStars - (sizeStars / 2);
            vertices.push(x, y, z);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xeeeeee,
            size: 20,
        });
        const starfield = new THREE.Points(geometry, particleMaterial);
        this.scene.add(starfield);

        // Add Fog
        this.scene.fog = new THREE.FogExp2(0x0D0D10, 0.000128);
        this.renderer.setClearColor(this.scene.fog.color, 1);

        this.galaxy = new Galaxy(this);
    }

    public async start(): Promise<void> {
        this.textures = new Textures();
        await this.textures.loadTextures();

        const loader = new FontLoader();
        this.font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json');

        await this.galaxy.init();

        //
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        this.render();
        this.events.emit("ready");
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.render();
    }

    private render() {
        requestAnimationFrame(() => { this.render(); });

        this.events.emit("render");

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

interface ED3DMapConfiguration {
    showGalaxyInfos: boolean;
}