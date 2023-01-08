import $ from 'jquery';
import * as THREE from 'three';
import * as OrbitControls from "three/examples/jsm/controls/OrbitControls";
import TWEEN from '@tweenjs/tween.js';
import { Action } from './action.class';
import { Galaxy } from './galaxy.class';
import { Grid } from './grid.class';
import { Heatmap } from './heat.class';
import { HUD } from './hud.class';
import { Route } from './route.class';
import { System } from './system.class';


export class Ed3d {
  //--
  light = null;
  renderer = null;
  raycaster = null;
  composer = null;
  //-- Map Vars
  routes = [];
  lensFlareSel = null;
  camSave = { x: 0, y: 0, z: 0 };
  camera = null;
  controls = null;
  isFarView = false;
  scene = null;
  container = null;
  basePath = './';
  jsonPath = null;
  jsonContainer = null;
  json = null;
  grid1H = null;
  grid1K = null;
  grid1XL = null;
  tween = null;
  globalView = true;
  //-- Fog density save
  fogDensity = null;
  //-- Defined texts
  textSel = [];
  //-- Object list by categories
  catObjs = [];
  catObjsRoutes = [];
  //-- Materials
  material = {
    Trd: new THREE.MeshBasicMaterial({
      color: 0xffffff
    }),
    line: new THREE.LineBasicMaterial({
      color: 0xcccccc
    }),
    white: new THREE.MeshBasicMaterial({
      color: 0xffffff
    }),
    orange: new THREE.MeshBasicMaterial({
      color: 0xFF9D00
    }),
    black: new THREE.MeshBasicMaterial({
      color: 0x010101
    }),
    lightblue: new THREE.MeshBasicMaterial({
      color: 0x0E7F88
    }),
    darkblue: new THREE.MeshBasicMaterial({
      color: 0x16292B
    }),
    selected: new THREE.MeshPhongMaterial({
      color: 0x0DFFFF
    }),
    grey: new THREE.MeshPhongMaterial({
      color: 0x7EA0A0
    }),
    transparent: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0
    }),
    glow_1: null,
    glow_2: null,
    spiral: null,
    permit_zone: null,
    custom: []
  };
  starSprite = 'textures/lensflare/star_grey2.png';
  colors = [];
  textures = {
    flare_white: null,
    flare_yellow: null,
    flare_center: null,
    spiral: null,
    permit_zone: null,
    white: null,
  };
  //-- Default color for system sprite
  systemColor = '#eeeeee';
  //-- HUD
  withHudPanel = false;
  withOptionsPanel = true;
  hudMultipleSelect = true;
  //-- Systems
  systems = []
  //-- Starfield
  starfield = null;
  //-- Start animation
  startAnim = true;
  //-- Scale system effect
  effectScaleSystem = [10, 800];
  //-- Graphical Options
  optDistObj = 1500;
  //-- Player position
  playerPos = [0, 0, 0];
  //-- Initial camera position
  cameraPos = null;
  //-- Active 2D top view
  isTopView = false;
  //-- Show galaxy infos
  showGalaxyInfos = false;
  //-- Show names near camera
  showNameNear = false;
  //-- Popup mode for click on detal
  popupDetail = false;
  //-- Objects
  Action: Action;
  Galaxy: Galaxy;
  //-- With button to toggle fullscreen
  withFullscreenToggle: false;
  //-- Collapse subcategories (false: don't collapse)
  categoryAutoCollapseSize: false;
  /**
   * Init Ed3d map
   *
   */
  loader: Loader = new Loader();

  public constructor(options) {
    // Merge options with defaults Ed3d
    var options = $.extend(Ed3d, options);

    this.Action = new Action(this);
    this.Galaxy = new Galaxy(this);

    //-- Init 3D map container
    $('#' + this.container).append('<div id="ed3dmap"></div>');

    //-- Load dependencies
    this.loader.update('Load core files');

    this.loader.update('Done !');
    await this.launchMap();
    if (typeof options.finished === "function") {
      options.finished();
    }

    window.addEventListener('resize', () => {
      this.refresh3dMapSize();
    });
  };

  /**
   * Rebuild completely system list and filter (for new JSon content)
   */

  public rebuild(options) {
    this.loader.start();

    // Remove System & HUD filters
    this.destroy();

    // Reload from JSon
    if (this.jsonPath != null) {
      this.loadDatasFromFile();
    }
    else if (this.jsonContainer != null) {
      this.loadDatasFromContainer();
    }

    this.Action.moveInitalPosition();

    this.loader.stop();
  }

  /**
   * Destroy the 3dmap
   */

  public destroy() {
    this.loader.start();

    // Remove System & HUD filters
    System.remove();
    HUD.removeFilters();
    Route.remove();
    this.Galaxy.remove();
    this.loader.stop();
  }

  /**
   * Launch
   */
  public async launchMap(): Promise<void> {
    this.loader.update('Textures');
    await this.loadTextures();

    this.loader.update('Launch scene');
    this.initScene();

    // Create grid

    this.grid1H = $.extend({}, new Grid(this, 100, 0x111E23, 0), {});
    this.grid1K = $.extend({}, new Grid(this, 1000, 0x22323A, 1000), {});
    this.grid1XL = $.extend({}, Grid.infos(10000, 0x22323A, 10000, this.scene), {});

    // Add some scene enhancement
    this.skyboxStars();

    // Create HUD
    HUD.create("ed3dmap");

    // Add galaxy center
    this.loader.update('Add Sagittarius A*');
    this.Galaxy.addGalaxyCenter();

    // Load systems
    this.loader.update('Loading JSON file');
    if (this.jsonPath != null) {
      this.loadDatasFromFile();
    }
    else if (this.jsonContainer != null) {
      this.loadDatasFromContainer();
    }
    else if ($('.ed3d-item').length > 0) {
      this.loadDatasFromAttributes();
    }
    else if (this.json != null) {
      this.loadDatas(this.json);
      this.loadDatasComplete();
      this.showScene();
    }
    else {
      this.loader.update('No JSON found.');
    }

    if (!this.startAnim) {
      this.grid1XL.hide();
      this.Galaxy.milkyway2D.visible = false;
    }

    // Animate
    this.animate();
  }

  /**
   * Init Three.js scene
   */

  public async loadTextures(): Promise<void> {
    //-- Load textures for lensflare
    const texloader = new THREE.TextureLoader();

    //-- Load textures
    this.textures.flare_white = await texloader.loadAsync(this.basePath + "textures/lensflare/flare2.png");
    this.textures.flare_yellow = await texloader.loadAsync(this.basePath + this.starSprite);
    this.textures.flare_center = await texloader.loadAsync(this.basePath + "textures/lensflare/flare3.png");
    this.textures.spiral = await texloader.loadAsync(this.basePath + "textures/lensflare/spiral_joe.png");
    this.textures.permit_zone = await texloader.loadAsync(this.basePath + "textures/hydra_invert.jpg");

    //-- Load sprites
    this.material.glow_1 = new THREE.SpriteMaterial({
      map: this.textures.flare_yellow,
      color: 0xffffff, transparent: false,
      fog: true
    });
    this.material.glow_2 = new THREE.SpriteMaterial({

      map: this.textures.flare_white,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5
    });

    this.material.spiral = new THREE.SpriteMaterial({
      map: this.textures.spiral,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1
    });

    this.material.permit_zone = new THREE.MeshBasicMaterial({
      map: this.textures.white,
      alphaMap: this.textures.permit_zone,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.33
    });
  }

  public addCustomMaterial(id, color) {
    const tColor = new THREE.Color('#' + color);
    this.colors[id] = tColor;
  }

  /**
   * Init Three.js scene
   */

  public initScene() {
    this.container = document.getElementById("ed3dmap");

    //Scene
    this.scene = new THREE.Scene();
    this.scene.visible = false;
    /*scene.scale.set(10,10,10);*/

    //camera
    this.camera = new THREE.PerspectiveCamera(45, this.container.offsetWidth / this.container.offsetHeight, 1, 200000);
    //camera = new THREE.OrthographicCamera( container.offsetWidth / - 2, container.offsetWidth / 2, container.offsetHeight / 2, container.offsetHeight / - 2, - 500, 1000 );

    this.camera.position.set(0, 500, 500);

    //HemisphereLight
    this.light = new THREE.HemisphereLight(0xffffff, 0xcccccc);
    this.light.position.set(-0.2, 0.5, 0.8).normalize();
    this.scene.add(this.light);

    //WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.sortObjects = false
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.domElement.style.zIndex = 5;
    this.container.appendChild(this.renderer.domElement);

    //controls
    this.controls = new OrbitControls.OrbitControls(this.camera, this.container);
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 2.0;
    this.controls.panSpeed = 0.8;
    this.controls.maxDistance = 60000;
    this.controls.enableZoom = 1;
    this.controls.enablePan = 1;
    this.controls.enableDamping = !0;
    this.controls.dampingFactor = .3;

    // Add Fog

    this.scene.fog = new THREE.FogExp2(0x0D0D10, 0.000128);
    this.renderer.setClearColor(this.scene.fog.color, 1);
    this.fogDensity = this.scene.fog.density;
  }

  /**
   * Show the scene when fully loaded
   */

  public showScene() {
    this.loader.stop();
    this.scene.visible = true;
  }

  /**
   * Load Json file to fill map
   */

  public loadDatasFromFile() {
    $.getJSON(this.jsonPath, (data) => {
      this.loadDatas(data);
    }).done(() => {
      this.loadDatasComplete();
      this.showScene();
    });
  };

  public loadDatasFromContainer() {
    var content = $('#' + this.jsonContainer).html();
    var json = null;

    try {
      json = JSON.parse(content);
    } catch (e) {
      console.log("Can't load JSon for systems");
    }
    if (json != null) {
      this.loadDatas(json);
    }

    this.loadDatasComplete();
    this.showScene();
  }

  public loadDatasFromAttributes() {
    var content = $('#' + this.jsonContainer).html();
    var json = [];
    $('.ed3d-item').each((e) => {
      var objName = $(this).html();
      var coords = $(this).data('coords').split(",");
      if (coords.length == 3)
        json.push({ name: objName, coords: { x: coords[0], y: coords[1], z: coords[2] } });
    });

    if (json != null) {
      this.loadDatas(json);
    }

    this.loadDatasComplete();

    this.showScene();
  }

  public loadDatas(data) {
    //-- Init Particle system
    System.initParticleSystem();

    //-- Load cat filters
    if (data.categories != undefined) HUD.initFilters(data.categories);

    //-- Check if simple or complex json
    let list = (data.systems !== undefined) ? data.systems : data;

    //-- Init Routes

    this.loader.update('Routes...');
    if (data.routes != undefined) {
      $.each(data.routes, (key, route) => {
        Route.initRoute(key, route);
      });
    }

    //-- Loop into systems

    this.loader.update('Systems...');
    $.each(list, (key, val) => {

      const system = System.create(val, this.scene);
      if (system != undefined) {
        if (val.cat != undefined) {
          this.addObjToCategories(system, val.cat);
        }
        if (val.cat != undefined) {
          this.systems.push(system);
        }
      }
    });

    //-- Routes
    if (data.routes != undefined) {
      $.each(data.routes, (key, route) => {
        Route.createRoute(key, route);
      });
    }

    //-- Heatmap
    if (data.heatmap != undefined) {
      Heatmap.create(data.heatmap);
    }

    //-- Check start position in JSon
    if (this.startAnim && data.position != undefined) {
      this.playerPos = [data.position.x, data.position.y, data.position.z];

      var camX = (parseInt(data.position.x) - 500);
      var camY = (parseInt(data.position.y) + 8500);
      var camZ = (parseInt(data.position.z) - 8500);
      this.cameraPos = [camX, camY, camZ];

      this.Action.moveInitalPosition(4000);
    }
  }

  public loadDatasComplete() {
    System.endParticleSystem();
    HUD.init();
    this.Action.init();
  }

  /**
   * Add an object to a category
   */

  public addObjToCategories(index, catList) {
    $.each(catList, (keyArr, idCat) => {
      if (this.catObjs[idCat] != undefined)
        this.catObjs[idCat].push(index);
    });
  }

  /**
   * Create a skybox of particle stars
   */

  public skyboxStars() {
    const sizeStars = 10000;

    const vertices = [];
    for (var p = 0; p < 5; p++) {
      const x = Math.random() * sizeStars - (sizeStars / 2);
      const y = Math.random() * sizeStars - (sizeStars / 2);
      const z = Math.random() * sizeStars - (sizeStars / 2);
      vertices.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    var particleMaterial = new THREE.PointsMaterial({
      color: 0xeeeeee,
      size: 2
    });
    this.starfield = new THREE.Points(geometry, particleMaterial);

    this.scene.add(this.starfield);
  }

  /**
   * Calc distance from Sol
   */
  public calcDistSol(target) {
    var dx = target.x;
    var dy = target.y;
    var dz = target.z;
    return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  public animate(time?: number) {
    //rendererStats.update(renderer);

    if (this.scene.visible == false) {
      requestAnimationFrame(this.animate);
      return;
    }

    this.refreshWithCamPos();
    //controls.noRotate().set(false);
    //controls.noPan().set(false);
    //controls.minPolarAngle = 0;
    //controls.maxPolarAngle = 0;

    this.controls.update();

    TWEEN.update(time);

    //-- If 2D top view, lock camera pos
    if (this.isTopView) {
      this.camera.rotation.set(-Math.PI / 2, 0, 0);
      this.camera.position.x = this.controls.target.x;
      this.camera.position.z = this.controls.target.z;
    }

    this.renderer.render(this.scene, this.camera);

    $('#cx').html(Math.round(this.controls.target.x).toString());
    $('#cy').html(Math.round(this.controls.target.y).toString());
    $('#cz').html(Math.round(-this.controls.target.z).toString()); // Reverse z coord

    $('#distsol').html(this.calcDistSol(this.controls.target).toString());

    //-- Move starfield with cam
    this.starfield.position.set(
      this.controls.target.x - (this.controls.target.x / 10) % 4000,
      this.controls.target.y - (this.controls.target.y / 10) % 4000,
      this.controls.target.z - (this.controls.target.z / 10) % 4000
    );

    //-- Change selection cursor size depending on camera distance

    var scale = this.distanceFromTarget(this.camera) / 200;

    this.Action.updateCursorSize(scale);

    HUD.rotateText('system');
    HUD.rotateText('coords');
    HUD.rotateText('system_hover');


    //-- Zoom on on galaxy effect
    this.Action.sizeOnScroll(scale);

    this.Galaxy.infosUpdateCallback(scale);

    if (scale > 25) {
      this.enableFarView(scale);

    } else {
      this.disableFarView(scale);
    }

    this.Action.updatePointClickRadius(scale);

    requestAnimationFrame(this.animate);
  }

  public enableFarView(scale, withAnim = true) {
    if (this.isFarView || this.Galaxy == null) return;

    this.isFarView = true;

    //-- Scale change animation
    var scaleFrom = { zoom: 25 };
    var scaleTo = { zoom: 500 };
    if (withAnim) {
      var obj = this;

      //controls.enabled = false;
      this.tween = new TWEEN.Tween(scaleFrom).to(scaleTo, 500)
        .start()
        .onUpdate(() => {
          obj.Galaxy.milkyway[0].material.size = scaleFrom.zoom;
          obj.Galaxy.milkyway[1].material.size = scaleFrom.zoom * 4;
        });

    } else {
      this.Galaxy.milkyway[0].material.size = scaleTo;
      this.Galaxy.milkyway[1].material.size = scaleTo.zoom * 4;
    }

    //-- Enable 2D galaxy
    this.Galaxy.milkyway2D.visible = this.Galaxy.milkyway[0].visible
    this.Galaxy.infosShow();


    //this.Galaxy.obj.scale.set(20,20,20);

    this.Action.updateCursorSize(60);

    this.grid1H.hide();
    this.grid1K.hide();
    this.grid1XL.show();
    this.starfield.visible = false;
    this.scene.fog.density = 0.000009;
  }

  public disableFarView(scale, withAnim = true) {
    if (!this.isFarView) return;

    this.isFarView = false;
    var oldScale = 1 / (25 / 3);

    //-- Scale change animation

    var scaleFrom = { zoom: 250 };
    var scaleTo = { zoom: 64 };
    if (withAnim) {

      var obj = this;

      //controls.enabled = false;
      this.tween = new TWEEN.Tween(scaleFrom).to(scaleTo, 500)
        .start()
        .onUpdate(() => {
          obj.Galaxy.milkyway[0].material.size = scaleFrom.zoom;
          obj.Galaxy.milkyway[1].material.size = scaleFrom.zoom;
        });

    } else {
      this.Galaxy.milkyway[0].material.size = scaleTo;
      this.Galaxy.milkyway[1].material.size = scaleTo;
    }

    //-- Disable 2D galaxy
    this.Galaxy.milkyway2D.visible = false;
    this.Galaxy.infosHide();

    //-- Show element
    this.Galaxy.milkyway[0].material.size = 16;

    //--
    this.camera.scale.set(1, 1, 1);

    this.Action.updateCursorSize(1);

    this.grid1H.show();
    this.grid1K.show();
    this.grid1XL.hide();
    this.starfield.visible = true;
    this.scene.fog.density = this.fogDensity;
  }

  public distanceFromTarget(v1) {
    var dx = v1.position.x - this.controls.target.x;
    var dy = v1.position.y - this.controls.target.y;
    var dz = v1.position.z - this.controls.target.z;

    return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  public refreshWithCamPos() {

    var d = new Date();
    var n = d.getTime();

    //-- Refresh only every 5 sec
    if (n % 1 != 0) return;

    this.grid1H.addCoords();
    this.grid1K.addCoords();

    //-- Refresh only if the camera moved
    var p = this.optDistObj / 2;
    if (
      this.camSave.x == Math.round(this.camera.position.x / p) * p &&
      this.camSave.y == Math.round(this.camera.position.y / p) * p &&
      this.camSave.z == Math.round(this.camera.position.z / p) * p
    ) return;

    //-- Save new pos

    this.camSave.x = Math.round(this.camera.position.x / p) * p;
    this.camSave.y = Math.round(this.camera.position.y / p) * p;
    this.camSave.z = Math.round(this.camera.position.z / p) * p;
  }

  public refresh3dMapSize() {
    if (this.renderer != undefined) {
      var width = this.container.offsetWidth;
      var height = this.container.offsetHeight;
      if (width < 100) width = 100;
      if (height < 100) height = 100;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}

/*
function render() {
  renderer.render(this.scene, camera);
}


//--------------------------------------------------------------------------
// Test perf

function distance(v1, v2) {
  var dx = v1.position.x - v2.position.x;
  var dy = v1.position.y - v2.position.y;
  var dz = v1.position.z - v2.position.z;

  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
}
*/

export class Loader {
  animCount: any;
  svgAnim = '<div id="loadInfos"></div><div id="loadTimer">.</div><svg width="100" height="100" viewbox="0 0 40 40"><path d="m5,8l5,8l5,-8z"   class="l1 d1" /><path d="m5,8l5,-8l5,8z"   class="l1 d2" /><path d="m10,0l5,8l5,-8z"  class="l1 d3" /><path d="m15,8l5,-8l5,8z"  class="l1 d4" /><path d="m20,0l5,8l5,-8z"  class="l1 d5" /><path d="m25,8l5,-8l5,8z"  class="l1 d6" /><path d="m25,8l5,8l5,-8z"  class="l1 d7" /><path d="m30,16l5,-8l5,8z" class="l1 d8" /><path d="m30,16l5,8l5,-8z" class="l1 d9" /><path d="m25,24l5,-8l5,8z" class="l1 d10" /><path d="m25,24l5,8l5,-8z" class="l1 d11" /><path d="m20,32l5,-8l5,8z" class="l1 d13" /><path d="m15,24l5,8l5,-8z" class="l1 d14" /><path d="m10,32l5,-8l5,8z" class="l1 d15" /><path d="m5,24l5,8l5,-8z"  class="l1 d16" /><path d="m5,24l5,-8l5,8z"  class="l1 d17" /><path d="m0,16l5,8l5,-8z"  class="l1 d18" /><path d="m0,16l5,-8l5,8z"  class="l1 d19" /><path d="m10,16l5,-8l5,8z" class="l2 d0" /><path d="m15,8l5,8l5,-8z"  class="l2 d3" /><path d="m20,16l5,-8l5,8z" class="l2 d6"  /><path d="m20,16l5,8l5,-8z" class="l2 d9" /><path d="m15,24l5,-8l5,8z" class="l2 d12" /><path d="m10,16l5,8l5,-8z" class="l2 d15" /></svg>';

  /**
   * Start loader
   */
  public start() {
    $('#loader').remove();
    $('<div></div>')
      .attr('id', 'loader')
      .html(this.svgAnim)
      .css('color', 'rgb(200, 110, 37)')
      .css('font-size', '1.5rem')
      .css('font-family', 'Helvetica')
      .css('font-variant', 'small-caps')
      .appendTo('#ed3dmap');
    if (this.animCount) {
      clearInterval(this.animCount);
    }
    this.animCount = setInterval(() => {
      var animProgress = $('#loader #loadTimer');
      animProgress.append('.');
      if (animProgress.html() != undefined && animProgress.html().length > 10) {
        animProgress.html('.');
      }
    }, 1000);
  }

  /**
   * Refresh infos for current loading step
   */

  public update(info) {
    $('#loader #loadInfos').html(info);
  }

  /**
   * Stop loader
   */

  public stop() {
    $('#loader').remove();
    clearInterval(this.animCount);
  }
}