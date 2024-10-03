
import {
  Mesh,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  MeshNormalMaterial,
  Vector3,
  AxesHelper,
  Box3
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ViewHelper } from "./viewHelper.js"; // Ensure this matches file name
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

let renderer, scene, camera, controls, helper, model;

init();
animate();

function init() {
  
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);


  scene = new Scene();

 
  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.up.set(0, 0, 1); // Z-axis is up
  camera.position.set(0, 0, 20); // Initial position


  controls = new OrbitControls(camera, renderer.domElement);
  controls.up = new Vector3(0, 0, 1);

  // ambient light
  scene.add(new AmbientLight(0x222222, 1));

  // directional light
  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(2, 2, 0);
  scene.add(light);

 
  const loader = new STLLoader();
  loader.load("./4.stl", (geometry) => {
      const material = new MeshNormalMaterial();
      model = new Mesh(geometry, material);
      scene.add(model);

      centerModel(model);
      adjustCameraToFitModel(model);
  });

  // helper
  helper = new ViewHelper(camera, renderer, "bottom-left", 256);
  helper.setControls(controls);
}

function centerModel(object) {
  const boundingBox = new Box3().setFromObject(object);

  const center = boundingBox.getCenter(new Vector3());

  object.position.sub(center);
}

function adjustCameraToFitModel(object) {
  const boundingBox = new Box3().setFromObject(object);
  const size = boundingBox.getSize(new Vector3());

  // Calculate the maximum dimension of the model
  const maxDim = Math.max(size.x, size.y, size.z);

  const fov = camera.fov * (Math.PI / 180); 
  const distance = maxDim / (2 * Math.tan(fov / 2)); 
  camera.position.set(0, 0, distance * 1.8);
  camera.lookAt(0, 0, 0); 

  controls.target.set(0, 0, 1);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);

  // clear renderer
  renderer.clear();
  // render scene
  renderer.render(scene, camera);
  // render helper
  if (helper && helper.render) {
      helper.render();
  }
}
