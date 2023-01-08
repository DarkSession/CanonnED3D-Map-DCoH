import * as THREE from 'three';
import { Ed3d } from './ed3dmap';
import { System } from './system.class';
import { HUD } from './hud.class';
import TWEEN from '@tweenjs/tween.js';

export class Action {
  cursorSel = null;
  cursorHover = null;
  cursorScale = 1;
  cursor = {
    selection: null,
    hover: null,
  };
  mouseVector = null;
  raycaster = null;
  oldSel = null;
  objHover = null;
  mouseUpDownTimer = null;
  mouseHoverTimer = null;
  animPosition = null;
  prevScale = null;
  pointCastRadius = 2;
  pointsHighlight = [];

  /**
   * Init Raycaster for events on Systems
   */

  public constructor(
    private readonly Ed3d: Ed3d
  ) {

    this.mouseVector = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();

    Ed3d.container.addEventListener('mousedown', (e) => { this.onMouseDown(e); }, false);
    Ed3d.container.addEventListener('mouseup', (e) => { this.onMouseUp(e); }, false);
    Ed3d.container.addEventListener('mousemove', (e) => { this.onMouseHover(e); }, false);

    Ed3d.container.addEventListener('mousewheel', this.stopWinScroll, false);
    Ed3d.container.addEventListener('DOMMouseScroll', this.stopWinScroll, false); // FF

    if (Ed3d.showNameNear) {
      console.log('Launch EXPERIMENTAL func');
      window.setInterval(() => {
        this.highlightAroundCamera();
      }, 1000);
    }
  }

  /**
   * Stop window scroll when mouse on scene
   */

  public stopWinScroll(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Update point click radius: increase radius with distance
   */

  public updatePointClickRadius(radius) {
    radius = Math.round(radius);
    if (radius < 2) radius = 2;
    if (this.pointCastRadius == radius) return;
    this.pointCastRadius = radius;
  }

  /**
   * Update particle size on zoom in/out
   */

  public sizeOnScroll(scale) {

    if (System.particle == undefined || scale <= 0) return;

    var minScale = this.Ed3d.effectScaleSystem[0];
    var maxScale = this.Ed3d.effectScaleSystem[1];
    var newScale = scale * 20;

    if (this.prevScale == newScale) return;
    this.prevScale = newScale;


    if (newScale > maxScale) newScale = maxScale;
    if (newScale < minScale) newScale = minScale;

    System.particle.material.size = newScale;
    System.scaleSize = newScale;
  }

  /**
   * Highlight selection around camera target (EXPERIMENTAL)
   */

  public highlightAroundCamera() {
    if (this.Ed3d.isFarView == true) return;

    var newSel = [];
    var limit = 50;
    var count = 0;

    var raycaster = new THREE.Raycaster(this.Ed3d.camera.position, this.Ed3d.camera.position);
    raycaster.params.Points.threshold = 100;

    var intersects = raycaster.intersectObjects(this.Ed3d.scene.children);
    if (intersects.length > 0) {

      //-- Highlight new selection

      for (var i = 0; i < intersects.length; i++) {

        if (count > limit) return;

        var intersection = intersects[i];
        if (intersection.object.clickable) {

          var indexPoint = intersection.index;
          var selPoint = intersection.object.geometry.vertices[indexPoint];

          if (selPoint.visible) {
            var textAdd = selPoint.name;
            var textId = 'highlight_' + indexPoint
            if (this.pointsHighlight.indexOf(textId) == -1) {

              HUD.addText(textId, textAdd, 0, 4, 0, 1, selPoint, true);

              this.pointsHighlight.push(textId);
            }
            newSel[textId] = textId;
          }

          count++;
        }
      }
    }

    //-- Remove old selection

    $.each(this.pointsHighlight, (key, item) => {
      if (newSel[item] == undefined) {
        var object = this.Ed3d.textSel[item];
        if (object != undefined) {
          this.Ed3d.scene.remove(object);
          this.Ed3d.textSel.splice(item, 1);
          this.pointsHighlight.splice(key, 1);
        }
      }
    });
  }

  /**
   * Mouse Hover
   */

  public onMouseHover(e) {

    e.preventDefault();

    var position = $('#ed3dmap').offset();
    var scrollPos = $(window).scrollTop();
    position.top -= scrollPos;

    this.mouseVector = new THREE.Vector3(
      ((e.clientX - position.left) / this.Ed3d.renderer.domElement.width) * 2 - 1,
      - ((e.clientY - position.top) / this.Ed3d.renderer.domElement.height) * 2 + 1,
      1);

    this.mouseVector.unproject(this.Ed3d.camera);
    this.raycaster = new THREE.Raycaster(this.Ed3d.camera.position, this.mouseVector.sub(this.Ed3d.camera.position).normalize());
    this.raycaster.params.Points.threshold = this.pointCastRadius;

    // create an array containing all objects in the scene with which the ray intersects
    var intersects = this.raycaster.intersectObjects(this.Ed3d.scene.children);
    if (intersects.length > 0) {

      for (var i = 0; i < intersects.length; i++) {
        var intersection = intersects[i];
        if (intersection.object.clickable) {

          var indexPoint = intersection.index;
          var selPoint = intersection.object.geometry.vertices[indexPoint];

          if (selPoint.visible) {
            this.hoverOnObj(indexPoint);
            return;
          }
        }
      }
    } else {
      this.outOnObj();
    }
  }

  public hoverOnObj(indexPoint) {

    if (this.objHover == indexPoint) return;
    this.outOnObj();

    this.objHover = indexPoint;

    var sel = System.particleGeo.vertices[indexPoint];
    this.addCursorOnHover(sel);
  }

  public outOnObj() {

    if (this.objHover === null || System.particleGeo.vertices[this.objHover] == undefined)
      return;

    this.objHover = null;
    this.cursor.hover.visible = false;
  }

  /**
   * On system click
   */

  public onMouseDown(e) {
    this.mouseUpDownTimer = Date.now();
  }

  /**
   * On system click
   */
  public onMouseUp(e) {
    e.preventDefault();

    //-- If long clic down, don't do anything

    var difference = (Date.now() - this.mouseUpDownTimer) / 1000;
    if (difference > 0.2) {
      this.mouseUpDownTimer = null;
      return;
    }
    this.mouseUpDownTimer = null;

    //-- Raycast object

    var position = $('#ed3dmap').offset();
    var scrollPos = $(window).scrollTop();
    position.top -= scrollPos;

    this.mouseVector = new THREE.Vector3(
      ((e.clientX - position.left) / this.Ed3d.renderer.domElement.width) * 2 - 1,
      - ((e.clientY - position.top) / this.Ed3d.renderer.domElement.height) * 2 + 1,
      1);

    this.mouseVector.unproject(this.Ed3d.camera);
    this.raycaster = new THREE.Raycaster(this.Ed3d.camera.position, this.mouseVector.sub(this.Ed3d.camera.position).normalize());
    this.raycaster.params.Points.threshold = this.pointCastRadius;

    // create an array containing all objects in the scene with which the ray intersects
    var intersects = this.raycaster.intersectObjects(this.Ed3d.scene.children);
    if (intersects.length > 0) {

      for (var i = 0; i < intersects.length; i++) {
        var intersection = intersects[i];
        if (intersection.object.clickable) {

          var indexPoint = intersection.index;
          var selPoint = intersection.object.geometry.vertices[indexPoint];

          if (selPoint.visible) {
            $('#hud #infos').html(
              "<h2>" + selPoint.name + "</h2>"
            );

            var isMove = this.moveToObj(indexPoint, selPoint);

            var opt = [selPoint.name];

            var optInfos = (selPoint.infos != undefined) ? selPoint.infos : null;
            var optUrl = (selPoint.url != undefined) ? selPoint.url : null;

            $(document).trigger("systemClick", [selPoint.name, optInfos, optUrl]);

            if (isMove) return;
          }
        }

        if (intersection.object.showCoord) {

          $('#debug').html(Math.round(intersection.point.x) + ' , ' + Math.round(-intersection.point.z));

          //Route.addPointToRoute(Math.round(intersection.point.x),0,Math.round(-intersection.point.z));
        }
      }

    }

    this.disableSelection();
  }

  /**
   * Move to the next visible system
   *
   * @param {int} indexPoint
   */

  public moveNextPrev(indexPoint, increment) {
    var find = false;
    while (!find) {

      //-- If next|previous is undefined, loop to the first|last
      if (indexPoint < 0) indexPoint = System.particleGeo.vertices.length - 1;
      else if (System.particleGeo.vertices[indexPoint] == undefined) indexPoint = 0;

      if (System.particleGeo.vertices[indexPoint].visible == true) {
        find = true;
      } else {
        indexPoint += increment
      }
    }

    //-- Move to
    var selPoint = System.particleGeo.vertices[indexPoint];
    this.moveToObj(indexPoint, selPoint);
  }

  /**
   * Disable current selection
   */

  public disableSelection() {

    if (this.cursor.selection == null) return;

    this.oldSel = null;
    this.cursor.selection.visible = false;

    $('#hud #infos').html('');

  }

  /**
   * Move to inital position without animation
   */
  public moveInitalPositionNoAnim() {

    var cam = [this.Ed3d.playerPos[0], this.Ed3d.playerPos[1] + 500, -this.Ed3d.playerPos[2] + 500];
    if (this.Ed3d.cameraPos != null) {
      cam = [this.Ed3d.cameraPos[0], this.Ed3d.cameraPos[1], -this.Ed3d.cameraPos[2]];
    }

    var moveTo = {
      x: cam[0], y: cam[1], z: cam[2],
      mx: this.Ed3d.playerPos[0], my: this.Ed3d.playerPos[1], mz: -this.Ed3d.playerPos[2]
    };
    this.Ed3d.camera.position.set(moveTo.x, moveTo.y, moveTo.z);
    this.Ed3d.controls.target.set(moveTo.mx, moveTo.my, moveTo.mz);
  }

  /**
   * Move to inital position
   */
  public moveInitalPosition(timer = 800) {

    this.disableSelection();

    //-- Move camera to initial position

    var moveFrom = {
      x: this.Ed3d.camera.position.x, y: this.Ed3d.camera.position.y, z: this.Ed3d.camera.position.z,
      mx: this.Ed3d.controls.target.x, my: this.Ed3d.controls.target.y, mz: this.Ed3d.controls.target.z
    };

    //-- Move to player position if defined, else move to Sol
    var cam = [this.Ed3d.playerPos[0], this.Ed3d.playerPos[1] + 500, -this.Ed3d.playerPos[2] + 500]
    if (this.Ed3d.cameraPos != null) {
      cam = [this.Ed3d.cameraPos[0], this.Ed3d.cameraPos[1], -this.Ed3d.cameraPos[2]];
    }

    var moveCoords = {
      x: cam[0], y: cam[1], z: cam[2],
      mx: this.Ed3d.playerPos[0], my: this.Ed3d.playerPos[1], mz: -this.Ed3d.playerPos[2]
    };

    this.Ed3d.controls.enabled = false;

    //-- Remove previous anim
    if (this.Ed3d.tween != null) {
      this.Ed3d.tween.removeAll();
    }

    //-- Launch anim
    this.Ed3d.tween = new TWEEN.Tween(moveFrom).to(moveCoords, timer)
      .start()
      .onUpdate(() => {
        this.Ed3d.camera.position.set(moveFrom.x, moveFrom.y, moveFrom.z);
        this.Ed3d.controls.target.set(moveFrom.mx, moveFrom.my, moveFrom.mz);
      })
      .onComplete(() => {
        this.Ed3d.controls.enabled = true;
        this.Ed3d.controls.update();
      });
  }

  /**
   * Move camera to a system
   *
   * @param {int} index - The system index
   * @param {object} obj - System datas
   */

  public moveToObj(index, obj) {
    if (this.oldSel !== null && this.oldSel == index) return false;

    this.Ed3d.controls.enabled = false;

    HUD.setInfoPanel(index, obj);

    if (obj.infos != undefined) HUD.openHudDetails();

    this.oldSel = index;
    var goX = obj.x;
    var goY = obj.y;
    var goZ = obj.z;

    //-- If in far view reset to classic view
    this.Ed3d.disableFarView(25, false);

    //-- Move grid to object
    this.moveGridTo(goX, goY, goZ);

    //-- Move camera to target (Smooth move using Tween)

    var moveFrom = {
      x: this.Ed3d.camera.position.x, y: this.Ed3d.camera.position.y, z: this.Ed3d.camera.position.z,
      mx: this.Ed3d.controls.target.x, my: this.Ed3d.controls.target.y, mz: this.Ed3d.controls.target.z
    };
    var moveCoords = {
      x: goX, y: goY + 15, z: goZ + 15,
      mx: goX, my: goY, mz: goZ
    };

    this.Ed3d.tween = new TWEEN.Tween(moveFrom).to(moveCoords, 800)
      .start()
      .onUpdate(() => {
        this.Ed3d.camera.position.set(moveFrom.x, moveFrom.y, moveFrom.z);
        this.Ed3d.controls.target.set(moveFrom.mx, moveFrom.my, moveFrom.mz);
      })
      .onComplete(() => {
        this.Ed3d.controls.update();
      });

    //-- 3D Cursor on selected object

    obj.material = this.Ed3d.material.selected;

    this.addCursorOnSelect(goX, goY, goZ);

    //-- Add text
    var textAdd = obj.name;
    var textAddC = Math.round(goX) + ', ' + Math.round(goY) + ', ' + Math.round(-goZ);

    HUD.addText('system', textAdd, 8, 20, 0, 6, this.cursor.selection);
    HUD.addText('coords', textAddC, 8, 15, 0, 3, this.cursor.selection);

    this.Ed3d.controls.enabled = true;

    return true;
  }

  /**
   * Create a cursor on selected system
   *
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */

  public addCursorOnSelect(x, y, z) {

    if (this.cursor.selection == null) {
      this.cursor.selection = new THREE.Object3D();

      //-- Ring around the system
      var geometryL = new THREE.TorusGeometry(8, 0.4, 3, 20);

      var selection = new THREE.Mesh(geometryL, this.Ed3d.material.selected);
      //selection.position.set(x, y, z);
      selection.rotation.x = Math.PI / 2;

      this.cursor.selection.add(selection);

      //-- Create a cone on the selection
      var geometryCone = new THREE.CylinderGeometry(0, 5, 16, 4, 1, false);
      var cone = new THREE.Mesh(geometryCone, this.Ed3d.material.selected);
      cone.position.set(0, 20, 0);
      cone.rotation.x = Math.PI;
      this.cursor.selection.add(cone);

      //-- Inner cone
      var geometryConeInner = new THREE.CylinderGeometry(0, 3.6, 16, 4, 1, false);
      var coneInner = new THREE.Mesh(geometryConeInner, this.Ed3d.material.black);
      coneInner.position.set(0, 20.2, 0);
      coneInner.rotation.x = Math.PI;
      this.cursor.selection.add(coneInner);

      this.Ed3d.scene.add(this.cursor.selection);
    }

    this.cursor.selection.visible = true;
    this.cursor.selection.position.set(x, y, z);
    this.cursor.hover.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);

  }

  /**
   * Create a cursor on hover
   *
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  public addCursorOnHover(obj) {

    if (this.cursor.hover == null) {
      this.cursor.hover = new THREE.Object3D();

      //-- Ring around the system
      var geometryL = new THREE.TorusGeometry(6, 0.4, 3, 20);

      var selection = new THREE.Mesh(geometryL, this.Ed3d.material.grey);
      selection.rotation.x = Math.PI / 2;

      this.cursor.hover.add(selection);

      this.Ed3d.scene.add(this.cursor.hover);
    }

    this.cursor.hover.position.set(obj.x, obj.y, obj.z);
    this.cursor.hover.visible = true;
    this.cursor.hover.scale.set(this.cursorScale, this.cursorScale, this.cursorScale);

    //-- Add text

    var textAdd = obj.name;
    HUD.addText('system_hover', textAdd, 0, 4, 0, 3, this.cursor.hover);
  }

  /**
   * Update cursor size with camera distance
   *
   * @param {number} distance
   */

  public updateCursorSize(scale) {
    var obj = this;

    $.each(this.cursor, (key, cur) => {
      if (cur != null) {
        cur.scale.set(scale, scale, scale);
      }
    });

    this.cursorScale = scale
  }

  /**
   * Move grid to selection
   *
   * @param {number} goX
   * @param {number} goY
   * @param {number} goZ
   */

  public moveGridTo(goX, goY, goZ) {
    var posX = Math.floor(goX / 1000) * 1000;
    var posY = Math.floor(goY);
    var posZ = Math.floor(goZ / 1000) * 1000;

    if (!this.Ed3d.grid1H.fixed) this.Ed3d.grid1H.obj.position.set(posX, posY, posZ);
    if (!this.Ed3d.grid1K.fixed) this.Ed3d.grid1K.obj.position.set(posX, posY, posZ);
    if (!this.Ed3d.grid1XL.fixed) this.Ed3d.grid1XL.obj.position.set(posX, posY, posZ);
  }
}