// Run Shooter - Complete Game using Three.js with Levels and Basic 3D Shapes
// Hosted on GitHub Pages

import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 1000);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Player - simple cube
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.5, 0);
scene.add(player);
let playerReady = true;

// Stats
let score = 0;
let health = 3;
let level = 1;
let levelDistance = 0;
let levelThreshold = 100;

// Enemies - red spheres
const enemies = [];
function spawnEnemy() {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    enemy.position.set(Math.random() * 10 - 5, 0.5, player.position.z - 50);
    scene.add(enemy);
    enemies.push(enemy);
}

// Power-ups - blue cylinders
const powerUps = [];
function spawnPowerUp() {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 12);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const pu = new THREE.Mesh(geometry, material);
    pu.position.set(Math.random() * 10 - 5, 0.5, player.position.z - 50);
    scene.add(pu);
    powerUps.push(pu);
}

// Controls
let moveX = 0;
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') moveX = -0.3;
    else if (e.key === 'ArrowRight') moveX = 0.3;
});
window.addEventListener('keyup', () => moveX = 0);

// HUD
const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.top = '10px';
hud.style.left = '10px';
hud.style.color = 'white';
hud.style.fontFamily = 'Arial';
hud.style.fontSize = '18px';
document.body.appendChild(hud);

function updateHUD() {
    hud.innerHTML = `Score: ${score} | Health: ${health} | Level: ${level}`;
}

// Camera
camera.position.y = 5;
camera.position.z = 5;

// Game Loop
function animate() {
    requestAnimationFrame(animate);
    if (!playerReady) return;

    // Move player
    player.position.x += moveX;
    const speed = 0.2 + (level - 1) * 0.05;
    player.position.z -= speed;
    levelDistance += speed;

    // Camera follow
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);

    // Level progression
    if (levelDistance >= levelThreshold) {
        level++;
        levelDistance = 0;
        health = Math.min(health + 1, 5);
        alert(`Level ${level}! Speed increased.`);
    }

    // Spawn enemies/powerups
    if (Math.random() < 0.02 + level * 0.002) spawnEnemy();
    if (Math.random() < 0.005) spawnPowerUp();

    // Move enemies and detect collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].position.z += speed / 2;
        if (enemies[i].position.distanceTo(player.position) < 1.5) {
            health--;
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            if (health <= 0) {
                alert('Game Over! Your score: ' + score);
                window.location.reload();
            }
        }
    }

    // Power-up collision
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].position.z += speed / 2;
        if (powerUps[i].position.distanceTo(player.position) < 1.5) {
            score += 10;
            scene.remove(powerUps[i]);
            powerUps.splice(i, 1);
        }
    }

    // Auto shooting (raycast simplified)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const dz = player.position.z - enemies[i].position.z;
        const dx = Math.abs(player.position.x - enemies[i].position.x);
        if (dz < 10 && dx < 2) {
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            score++;
        }
    }

    updateHUD();
    renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
