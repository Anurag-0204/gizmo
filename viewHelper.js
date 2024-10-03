import {
    BufferGeometry,
    CanvasTexture,
    Clock,
    Color,
    Euler,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    OrthographicCamera,
    PlaneGeometry,
    Quaternion,
    Raycaster,
    Vector2,
    Vector3,
    Vector4,
    DoubleSide,
    BufferAttribute,
    AmbientLight,
    CylinderGeometry,
    Group,
    SphereGeometry,
    ConeGeometry
  } from "three";
  
  const [FRONT, BACK, LEFT, RIGHT, TOP, BOTTOM, F_T, F_L, F_B, F_R, B_T, B_B, B_R, B_L, R_T, R_B,L_B, L_T, F_T_L, F_T_R, F_B_L, F_B_R, B_T_L, B_T_R, B_B_L, B_B_R] = Array(26)
    .fill(0)
    .map((_, i) => i);
  
  const axesColors = [
    new Color(0xff3653),
    new Color(0x8adb00),
    new Color(0x2c8fff),
    new Color(0xffffff),
    new Color(0x000000),
  ];
  
  const clock = new Clock();
  const targetPosition = new Vector3();
  const targetQuaternion = new Quaternion();
  const euler = new Euler();
  const q1 = new Quaternion();
  const q2 = new Quaternion();
  // const point = new Vector3();
  const dim = 256;
  const turnRate = 2 * Math.PI; 
  const raycaster = new Raycaster();
  const mouse = new Vector2();
  const mouseStart = new Vector2();
  const mouseAngle = new Vector2();
  // const dummy = new Object3D();
  let radius = 0;
  
  class ViewHelper extends Object3D {
    constructor(camera, renderer, placement = "bottom-right", size = 128) {
      super();
      this.renderer = renderer;
      this.camera = camera;
      this.domElement = renderer.domElement;
  
      this.orthoCamera = new OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0, 4);
      this.orthoCamera.up.set(0,0,1);
      this.isViewHelper = true;
      this.animating = false;
      this.target = new Vector3();
      this.dragging = false;
      this.viewport = new Vector4();
      this.offsetHeight = 0;
  
      this.orthoCamera.position.set(0, 0, 2);
      this.planePoints = getAxesPlanePoints();
      this.add(...this.planePoints);
      this.domContainer = getDomContainer(placement, size);
      this.domElement.parentElement.appendChild(this.domContainer);
      this.domRect = this.domContainer.getBoundingClientRect();
      this.startListening();
      this.controlsChangeEvent = { listener: () => this.updateOrientation() };
      this.update();
      this.updateOrientation();

      const ambientLight = new AmbientLight(0xffffff, 1); // Soft white light
      ambientLight.position.set(2,2,0)
      this.add(ambientLight);

      const axesHelperX = new createAxesHelper(new Color(0xFF0000),0.05);
      const axesHelperY = new createAxesHelper(new Color(0x00FF00),0.05);
      const axesHelperZ = new createAxesHelper(new Color(0x0000FF),0.05);



      axesHelperX.position.set(0,-0.8,-0.8)
      axesHelperY.position.set(-1,0.2,-0.8)
      axesHelperZ.position.set(-1,-0.8,0.2)

      axesHelperX.rotation.z = -Math.PI / 2;
      axesHelperZ.rotation.x = Math.PI / 2;

      addSpriteToTop(axesHelperX);
      addSpriteToTop(axesHelperY);
      addSpriteToTop(axesHelperZ);

      this.add(axesHelperX);
      this.add(axesHelperY);
      this.add(axesHelperZ);
    }
      

    
  
    startListening() {
      this.domContainer.onpointerdown = (e) => this.onPointerDown(e);
      this.domContainer.onpointermove = (e) => this.onPointerMove(e);
      this.domContainer.onpointerleave = () => this.onPointerLeave();
    }
  
    onPointerDown(e) {
      const drag = (e) => {
        if (!this.dragging && isClick(e, mouseStart)) return;
        if (!this.dragging) {
          resetPlanes(this.planePoints);
          this.dragging = true;
        }
  
        mouseAngle
          .set(e.clientX, e.clientY)
          .sub(mouseStart)
          .multiplyScalar((1 / this.domRect.width) * Math.PI);
  
        this.rotation.x = clamp(
          rotationStart.x + mouseAngle.y,
          -Math.PI,
          0.0
        );
        this.rotation.z = rotationStart.z + mouseAngle.x;
        this.updateMatrixWorld();
        q1.copy(this.quaternion).invert();
        this.camera.position
          .set(0, 0, 1)
          .applyQuaternion(q1)
          .multiplyScalar(radius)
          .add(this.target);
  
        this.camera.rotation.setFromQuaternion(q1);
        this.updateOrientation(false);
      };
      const endDrag = () => {
        document.removeEventListener("pointermove", drag, false);
        document.removeEventListener("pointerup", endDrag, false);
  
        if (!this.dragging) {
          this.handleClick(e);
          return;
        }
        this.dragging = false;
      };
  
      if (this.animating === true) return;
      e.preventDefault();
  
      mouseStart.set(e.clientX, e.clientY);
      const rotationStart = euler.copy(this.rotation);
  
      setRadius(this.camera, this.target);
  
      document.addEventListener("pointermove", drag, false);
      document.addEventListener("pointerup", endDrag, false);
    }
  
    onPointerMove(e) {
        if (this.dragging) return;
        this.handleHover(e);
    }

    onPointerLeave() {
        if (this.dragging) return;
        resetPlanes(this.planePoints); 
        this.domContainer.stylecursor = "";
    }

    handleClick(e) {
        try {
            const object = getIntersectionObject(
              e,
              this.domRect,
              this.orthoCamera,
              this.planePoints
            );
            if (!object) return;
            this.setOrientation(object.userData.type);

        }
        catch (e) {
            console.error(e);
        }
    }

    handleHover(e) {
        const object = getIntersectionObject(
          e,
          this.domRect,
          this.orthoCamera,
          this.planePoints
        );
        resetPlanes(this.planePoints);
        this.planePoints.forEach(plane => {
          plane.material.reflectivity = 1;
          plane.material.color.set(0x666666); // Reset to original color
      });
        if (!object) {
          this.domContainer.stylecursor = "";
          this.planePoints.forEach(plane => {
            plane.material.reflectivity = 1;
            
          })
        } else {
          object.material.reflectivity = 0;
          object.material.color.set(0xd3d3d3); 
        
          this.domContainer.stylecursor = "pointer";
          
        }
    }
    
    setControls(controls) {
        
      if (this.controls) {
        this.controls.removeEventListener(
          "change",
          this.controlsChangeEvent.listener
        );
        this.target = new Vector3();
      }
      if (!controls) return;
      this.controls = controls;
      controls.addEventListener("change", this.controlsChangeEvent.listener);
      this.target = controls.target;
    }
  

    render() {
      const delta = clock.getDelta();
      if (this.animating) 
        this.animate(delta);
      const x = this.domRect.left;
      const y = this.offsetHeight - this.domRect.bottom;
      const autoClear = this.renderer.autoClear;
      this.renderer.autoClear = false;
      this.renderer.setViewport(x, y, dim, dim);
      this.renderer.render(this, this.orthoCamera);
      this.renderer.setViewport(this.viewport);
      this.renderer.autoClear = autoClear;
    }
  
    updateOrientation(fromCamera = true) {
      if (fromCamera) {
        this.quaternion.copy(this.camera.quaternion).invert();
        this.updateMatrixWorld();
      }
     
    }
  
    update() {
      this.domRect = this.domContainer.getBoundingClientRect();
      this.offsetHeight = this.domElement.offsetHeight;
      setRadius(this.camera, this.target);
      this.renderer.getViewport(this.viewport);
      this.updateOrientation();
    }
  
    animate(delta) {
      const err = 0.00001;
      const step = delta * turnRate;

      q1.rotateTowards(q2, step);

      this.camera.position
        .set(0, 0, 1)
        .applyQuaternion(q1)
        .multiplyScalar(radius)
        .add(this.target);


      this.camera.quaternion.rotateTowards(targetQuaternion, step);

      this.updateOrientation();
      if (q1.angleTo(q2) < err ) {
        this.animating = false;
        q1.copy(q2);
      }
    }
  
    setOrientation(orientation) {
       
      prepareAnimationData(this.camera, this.target, orientation);
      this.animating = true;
    }
  
    dispose() {
      this.axesLines.geometry.dispose();
      this.axesLines.material.dispose();
  
      this.planePoints.forEach((plane) => {
        plane.material.map.dispose();
        plane.material.dispose();
      });

      this.domContainer.remove();
  
      if (this.controls)
        this.controls.removeEventListener(
          "change",
          this.controlsChangeEvent.listener
        );
    }
  }

  function createAxesHelper(color, radius){
    const geometry = new CylinderGeometry(radius/2, radius/2, 2, 10 );
    const material = new MeshBasicMaterial({color});

    const axesHelper = new Group();

    const xAxis = new Mesh(geometry, material);
    axesHelper.add(xAxis);

    const yAxis = new Mesh(geometry, material);
    axesHelper.add(yAxis);

    const zAxis = new Mesh(geometry, material);
    axesHelper.add(zAxis);

    return axesHelper;
  }

  function addSpriteToTop(axesHelper) {
    const Geometry = new ConeGeometry( 0.1, 0.25, 10 );
    const Material = new MeshBasicMaterial({ color: 0xffffff , side: DoubleSide});
    const tip = new Mesh(Geometry, Material);
    tip.position.set(0, 1, 0);  
    axesHelper.add(tip);
}
  
  function getDomContainer(placement, size) {
    const div = document.createElement("div");
    const style = div.style;
  
    style.height = `${size}px`;
    style.width = `${size}px`;
    style.borderRadius = "100%";
    style.position = "absolute";
  
    const [y, x] = placement.split("-");
    style.transform = "";
    style.left = x === "left" ? "0" : x === "center" ? "50%" : "";
    style.right = x === "right" ? "0" : "";
    style.transform += x === "center" ? "translateX(-50%)" : "";
    style.top = y === "top" ? "0" : y === "bottom" ? "" : "50%";
    style.bottom = y === "bottom" ? "0" : "";
    style.transform += y === "center" ? "translateY(-50%)" : "";
  
    return div;
  }
  

  function getAxesPlanePoints() {
    const planes = [];

    let dim = 0.6;
    let face = 0.4;
    let face_2 = face * 2;
    //let slant = dim - face;
    
    let vertices = [
      // Top
      -face, -face, dim,    // 0 top ka bottom left
      face, -face, dim,     // 1 top ka bottom right
      face, face, dim,      // 2 top ka top right
      -face, face, dim,     // 3 top ka top left
      
      // Bottom
      -face, -face, -dim,   //4 bottom ka top left
      face, -face, -dim,    //5 bottom ka top right
      face, face, -dim,     //6 bottom ka bottom right
      -face, face, -dim,    //7 bottom ka bottom left

      // Left
      -dim, -face, -face,   // 8 left ka right bottom
      -dim, -face, face,    // 9 left ka right top
      -dim, face, face,     //10 left ka top left
      -dim, face, -face,    //11 left ka bottom left
      
      // Right
      dim, -face, -face,    // 12 right ka bottom left
      dim, -face, face,     // 13 right ka top left
      dim, face, face,      // 14 right ka top right
      dim, face, -face,     // 15 right ka bottom right

      // Front
      -face, -dim, -face,    // 16 front ka bottom left
      -face, -dim, face,     // 17 front ka top left
      face, -dim, face,      // 18 front ka top right
      face, -dim, -face,     // 19 front ka bottom right

      // Back
      -face, dim, -face,   // 20 back ka bottom right 
      -face, dim, face,    // 21 back ka top right
      face, dim, face,     // 22 back ka top left
      face, dim, -face,    // 23 back ka bottom left
    ]

    let verticesBuffer = new Float32Array(vertices)
    let vertexBuffer = new BufferAttribute(verticesBuffer, 3)
    
    let frontGeom = new PlaneGeometry(face_2,face_2);
    planes[FRONT] = new Mesh(frontGeom, getPlaneMaterial("LEFT", axesColors[3]));
    planes[FRONT].userData.type = "front";
    planes[FRONT].position.set(0,-0.6,0);
    planes[FRONT].rotation.x= Math.PI/2; 

    let backGeom = new PlaneGeometry(face_2,face_2);
    planes[BACK] = new Mesh(backGeom, getPlaneMaterial("RIGHT", axesColors[3]));
    planes[BACK].userData.type = "back";
    planes[BACK].position.set(0,0.6,0);
    planes[BACK].rotation.x= -Math.PI/2;
    planes[BACK].rotation.z= Math.PI; 

    let rightGeom = new PlaneGeometry(face_2,face_2);
    planes[RIGHT] = new Mesh(rightGeom, getPlaneMaterial("FRONT", axesColors[3]));
    planes[RIGHT].userData.type = "right";
    planes[RIGHT].position.set(0.6,0,0);
    planes[RIGHT].rotation.x= -Math.PI/2;
    planes[RIGHT].rotation.y= Math.PI/2;
    planes[RIGHT].rotation.z= Math.PI;

    let leftGeom = new PlaneGeometry(face_2,face_2);
    planes[LEFT] = new Mesh(leftGeom, getPlaneMaterial("BACK", axesColors[3]));
    planes[LEFT].userData.type = "left";
    planes[LEFT].position.set(-0.6,0,0);
    planes[LEFT].rotation.x= Math.PI/2;
    planes[LEFT].rotation.y= -Math.PI/2;

    let topGeom = new PlaneGeometry(face_2,face_2);
    planes[TOP] = new Mesh(topGeom, getPlaneMaterial("TOP", axesColors[3]));
    planes[TOP].userData.type = "top";
    planes[TOP].position.set(0,0,0.6);
    planes[TOP].rotation.x= Math.PI; 
    planes[TOP].rotation.y= Math.PI; 
    planes[TOP].rotation.z= -Math.PI/2; 

    let bottomGeom = new PlaneGeometry(face_2,face_2);
    planes[BOTTOM] = new Mesh(bottomGeom, getPlaneMaterial("BOTTOM", axesColors[3]));
    planes[BOTTOM].userData.type = "bottom";
    planes[BOTTOM].position.set(0,0,-0.6);
    planes[BOTTOM].rotation.x= Math.PI; 
    planes[BOTTOM].rotation.z= -Math.PI/2;  

    let frGeom = new BufferGeometry()
    frGeom.setAttribute("position", vertexBuffer)
    frGeom.setIndex([18, 12, 13, 19, 12, 18])
    planes[F_R] = new Mesh(frGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_R].userData.type = "f_r";

    let ftGeom = new BufferGeometry()
    ftGeom.setAttribute("position", vertexBuffer)
    ftGeom.setIndex([18, 1, 0, 18,0,17])
    planes[F_T] = new Mesh(ftGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_T].userData.type = "f_t";

    let flGeom = new BufferGeometry()
    flGeom.setAttribute("position", vertexBuffer)
    flGeom.setIndex([16,17,9,8,16,9])
    planes[F_L] = new Mesh(flGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_L].userData.type = "f_l";

    let fbGeom = new BufferGeometry()
    fbGeom.setAttribute("position", vertexBuffer)
    fbGeom.setIndex([16,4,19,4,5,19])
    planes[F_B] = new Mesh(fbGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_B].userData.type = "f_b";

    let rtGeom = new BufferGeometry()
    rtGeom.setAttribute("position", vertexBuffer)
    rtGeom.setIndex([1,13,14,14,2,1])
    planes[R_T] = new Mesh(rtGeom, getPlaneMaterial("", axesColors[3]));
    planes[R_T].userData.type = "r_t";

    let rbGeom = new BufferGeometry()
    rbGeom.setAttribute("position", vertexBuffer)
    rbGeom.setIndex([5,6,12,15,12,6])
    planes[R_B] = new Mesh(rbGeom, getPlaneMaterial("", axesColors[3]));
    planes[R_B].userData.type = "r_b";

    let ltGeom = new BufferGeometry()
    ltGeom.setAttribute("position", vertexBuffer)
    ltGeom.setIndex([3,10,9,9,0,3])
    planes[L_T] = new Mesh(ltGeom, getPlaneMaterial("", axesColors[3]));
    planes[L_T].userData.type = "l_t";

    let lbGeom = new BufferGeometry()
    lbGeom.setAttribute("position", vertexBuffer)
    lbGeom.setIndex([11,7,4,4,8,11])
    planes[L_B] = new Mesh(lbGeom, getPlaneMaterial("", axesColors[3]));
    planes[L_B].userData.type = "l_b";

    let brGeom = new BufferGeometry()
    brGeom.setAttribute("position", vertexBuffer)
    brGeom.setIndex([15,23,22,22,14,15])
    planes[B_R] = new Mesh(brGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_R].userData.type = "b_r";

    let btGeom = new BufferGeometry()
    btGeom.setAttribute("position", vertexBuffer)
    btGeom.setIndex([22,21,3,3,2,22])
    planes[B_T] = new Mesh(btGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_T].userData.type = "b_t";

    let blGeom = new BufferGeometry()
    blGeom.setAttribute("position", vertexBuffer)
    blGeom.setIndex([20,11,10,10,21,20])
    planes[B_L] = new Mesh(blGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_L].userData.type = "b_l";

    let bbGeom = new BufferGeometry()
    bbGeom.setAttribute("position", vertexBuffer)
    bbGeom.setIndex([6,7,23,7,20,23])
    planes[B_B] = new Mesh(bbGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_B].userData.type = "b_b";

    let ftrGeom = new BufferGeometry()
    ftrGeom.setAttribute("position", vertexBuffer)
    ftrGeom.setIndex([18, 13, 1])
    planes[F_T_R] = new Mesh(ftrGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_T_R].userData.type = "f_t_r";

    let ftlGeom = new BufferGeometry()
    ftlGeom.setAttribute("position", vertexBuffer)
    ftlGeom.setIndex([17,0,9])
    planes[F_T_L] = new Mesh(ftlGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_T_L].userData.type = "f_t_l";

    let fbrGeom = new BufferGeometry()
    fbrGeom.setAttribute("position", vertexBuffer)
    fbrGeom.setIndex([19,5, 12])
    planes[F_B_R] = new Mesh(fbrGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_B_R].userData.type = "f_b_r";

    let fblGeom = new BufferGeometry()
    fblGeom.setAttribute("position", vertexBuffer)
    fblGeom.setIndex([16,8,4])
    planes[F_B_L] = new Mesh(fblGeom, getPlaneMaterial("", axesColors[3]));
    planes[F_B_L].userData.type = "f_b_l";

    let btrGeom = new BufferGeometry()
    btrGeom.setAttribute("position", vertexBuffer)
    btrGeom.setIndex([21,10,3])
    planes[B_T_R] = new Mesh(btrGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_T_R].userData.type = "b_t_r";

    let bbrGeom = new BufferGeometry()
    bbrGeom.setAttribute("position", vertexBuffer)
    bbrGeom.setIndex([20,7,11])
    planes[B_B_R] = new Mesh(bbrGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_B_R].userData.type = "b_b_r";

    let bblGeom = new BufferGeometry()
    bblGeom.setAttribute("position", vertexBuffer)
    bblGeom.setIndex([23,15,6])
    planes[B_B_L] = new Mesh(bblGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_B_L].userData.type = "b_b_l";

    let btlGeom = new BufferGeometry()
    btlGeom.setAttribute("position", vertexBuffer)
    btlGeom.setIndex([22,2,14])
    planes[B_T_L] = new Mesh(btlGeom, getPlaneMaterial("", axesColors[3]));
    planes[B_T_L].userData.type = "b_t_l";

    return planes;
}

  function getPlaneMaterial(axis, color) {
    const dim = 256
    const canvas = document.createElement("canvas");
    canvas.width = dim;
    canvas.height = dim;
    const context = canvas.getContext("2d");

    context.fillStyle = `#${color.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  
    context.fillStyle = "#222222";
    context.font = `1000 50px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(axis, dim/2, dim/2);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    return new MeshBasicMaterial({
      color: 0xaaaaaa,
      map: texture,
      side: DoubleSide,
    });
  }

  function resetPlanes(planes) {
    planes.forEach((plane) => {
      plane.material.map.offset.x = 0;
      plane.material.map.offset.y = 0;
      plane.material.map.offset.z = 0;
      plane.scale.set(1, 1, 1);
    });
  }
  
  function setRadius(camera, target) {
    radius = camera.position.distanceTo(target);
  }
  
  function getIntersectionObject(event, domRect, camera, objects) {
    const x = (event.clientX - domRect.left) / domRect.width;
    const y = (event.clientY - domRect.top) / domRect.height;
    mouse.set(x * 2 - 1, -y * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const [intersection] = raycaster.intersectObjects(objects);
    return intersection && intersection.object;
  }
  
  function isClick(e, mouseStart) {
    return mouseStart.distanceToSquared({ x: e.clientX, y: e.clientY }) < 5;
  }
  
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  function prepareAnimationData(camera, target, orientation) {
    q2.setFromEuler(euler.set(0, 0, 0));
  
    switch (orientation) {
        case "front":
            q2.setFromEuler(euler.set(Math.PI / 2,0, 0));
            break;
        case "back":
            q2.setFromEuler(euler.set( Math.PI / 2, - Math.PI , 0));
            break;
        case "right":
            q2.setFromEuler(euler.set( Math.PI / 2, Math.PI / 2, 0));
            break;
        case "left":
            q2.setFromEuler(euler.set(Math.PI / 2,  -Math.PI / 2, 0));
            break;
        case "top":
            q2.setFromEuler(euler.set(0, 0, Math.PI / 2)); 
            break;
        case "bottom":
            q2.setFromEuler(euler.set(0, Math.PI,  Math.PI/2 ));
            break;

        //front
        case "f_r":
            q2.setFromEuler(euler.set(Math.PI / 2, Math.PI / 4, 0 )); 
            break;
        case "f_l":
            q2.setFromEuler(euler.set(Math.PI / 2,-Math.PI / 4 , 0)); 
            break;
        case "f_b":
            q2.setFromEuler(euler.set(-5*Math.PI /4,0,0));
            break;
        case "f_t":
            q2.setFromEuler(euler.set( Math.PI / 4,0, 0)); 
            break;

        //back
        case "b_l":
            q2.setFromEuler(euler.set(Math.PI / 2, -3*Math.PI / 4,0)); 
            break;
        case "b_r":
            q2.setFromEuler(euler.set(-Math.PI/2, Math.PI / 4, Math.PI )); 
            break;
        case "b_t":
            q2.setFromEuler(euler.set(-Math.PI/4 ,0, Math.PI)); 
            break;
        case "b_b":
            q2.setFromEuler(euler.set(Math.PI * 1.25,0,Math.PI));        //////////////////////////////////////////////////////////////////
            break;
          //right

        case "r_b":
            q2.setFromEuler(euler.set(Math.PI,Math.PI/4,-Math.PI/2)); 
            break;
        case "r_t":
            q2.setFromEuler(euler.set(0, Math.PI/4,Math.PI/2 )); 
        break;

          //left
        case "l_t":
            q2.setFromEuler(euler.set(0,-Math.PI/4,-Math.PI/2 )); 
            break;
        case "l_b":
            q2.setFromEuler(euler.set(0, -3*Math.PI/4,-Math.PI/2 )); 
            break;


        case "f_t_r":
            q2.setFromEuler(euler.set(Math.PI/4, Math.PI /5,Math.PI/6 ));
            break;
        case "f_t_l":
            q2.setFromEuler(euler.set(Math.PI/4,-Math.PI/5,-Math.PI/6));
            break;
        case "f_b_r":
            q2.setFromEuler(euler.set(Math.PI * 0.75, Math.PI /5,-Math.PI/6 ));
            // q2.setFromEuler(euler.set(-5*Math.PI/4,Math.PI/5,Math.PI/6));
            break;
        case "f_b_l":
            q2.setFromEuler(euler.set(Math.PI * 0.75,-Math.PI/5,Math.PI/6));
            // q2.setFromEuler(euler.set(-5*Math.PI/4,-Math.PI/5,-Math.PI/6));
            break;
        case "b_t_r":
            q2.setFromEuler(euler.set(-Math.PI/4,-Math.PI/5,Math.PI+Math.PI/6));
            break;
        case "b_b_r":
            q2.setFromEuler(euler.set(-3*Math.PI/4,-Math.PI/5,Math.PI-Math.PI/6));
            break;
        case "b_b_l":
            q2.setFromEuler(euler.set(-3*Math.PI/4,Math.PI/5,Math.PI+Math.PI/6));
            break;
        case "b_t_l":
            q2.setFromEuler(euler.set(-Math.PI/4,Math.PI/5,Math.PI-Math.PI/6));
            break;
        default:
            q2.setFromEuler(euler.set(0,0,0));
            break;

    }
    q1.copy(camera.quaternion);
    targetPosition.set(0, 0, 0).applyQuaternion(q2).multiplyScalar(radius).add(target);
    targetQuaternion.copy(q2);
   }
  
  export { ViewHelper };
  