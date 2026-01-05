import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURATION SCÈNE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- 1. FOND ÉTOILÉ (Phase 6) ---
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
const starVertices = [];
for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 1000;
    const y = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- LUMIÈRES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// --- LE GLOBE ---
const globeRadius = 5;
const loader = new THREE.TextureLoader();
const globeMat = new THREE.MeshStandardMaterial({
    map: loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
    bumpMap: loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    bumpScale: 0.15
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(globeRadius, 64, 64), globeMat);
scene.add(earth);

// --- GESTION DES PAYS ---
const countriesGroup = new THREE.Group();
scene.add(countriesGroup);

function setPos(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

fetch('./countries.geojson')
    .then(res => res.json())
    .then(data => {
        data.features.forEach(country => {
            const coordinates = country.geometry.coordinates;
            // On utilise un blanc transparent pour plus de classe
            const lineMat = new THREE.LineBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.3 
            });

            coordinates.forEach(polygon => {
                const points = [];
                const coords = country.geometry.type === 'MultiPolygon' ? polygon[0] : polygon;
                coords.forEach(coord => {
                    points.push(setPos(coord[1], coord[0], globeRadius + 0.02));
                });
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat);
                line.userData = { name: country.properties.ADMIN, iso: country.properties.ISO_A2 };
                countriesGroup.add(line);
            });
        });
    });

// --- INTERACTIVITÉ (RAYCASTER) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredCountry = null;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(countriesGroup.children);

    // Effet de survol (Hover)
    if (intersects.length > 0) {
        if (hoveredCountry) hoveredCountry.material.opacity = 0.3; // Reset l'ancien
        hoveredCountry = intersects[0].object;
        hoveredCountry.material.opacity = 1.0; // Illumine le nouveau
        document.body.style.cursor = 'pointer';
    } else {
        if (hoveredCountry) hoveredCountry.material.opacity = 0.3;
        hoveredCountry = null;
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('click', () => {
    if (hoveredCountry) {
        console.log("Pays sélectionné :", hoveredCountry.userData.name);
        // Ici on appellera le backend plus tard
    }
});

// --- RENDER ---
camera.position.z = 15;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.0002; // Les étoiles tournent doucement
    controls.update();
    renderer.render(scene, camera);
}
animate();