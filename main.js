import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Configuration
const TEXT_SEQUENCE = 'ARSENAL'.split('');
const DISPLAY_DURATION = 1100; // Slightly faster sweep (from 1400ms)
const BLANK_DURATION = 1000; // 1 second blank period
const COLORS = [0xFF3232, 0x4000FF, 0x00FF88];
const FONT_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';

// Interaction state
let isDragging = false;
let mousePosition = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0, z: 0 };
let rotationVelocity = {
    x: (Math.random() - 0.5) * 0.002,
    y: (Math.random() - 0.5) * 0.002,
    z: (Math.random() - 0.5) * 0.002
};
let pulseValue = 0; // "Boing" effect value (0 to 1)

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 12; // Moved back for better depth feel

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1); // Black background

// Post-processing setup
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    1.0, // radius
    0.1  // threshold
);
bloomPass.threshold = 0.05;
bloomPass.strength = 0.6; // Increased from 0.4 for more blur
bloomPass.radius = 0.9; // Increased from 0.6 for wider glow

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Add background plane for ambient glow effect
const bgGeometry = new THREE.PlaneGeometry(50, 50);
const bgMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uGlowColor: { value: new THREE.Color(0x000000) },
        uGlowIntensity: { value: 0.0 },
        uGlowPosition: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uGlowIntensity;
        uniform vec2 uGlowPosition;
        varying vec2 vUv;
        
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f*f*(3.0-2.0*f);
            float n = i.x + i.y*57.0;
            return mix(mix(hash(n+0.0), hash(n+1.0), f.x),
                       mix(hash(n+57.0), hash(n+58.0), f.x), f.y);
        }
        
        void main() {
            // Add noise-based jitter to glow position for scattering feel
            float n = noise(vUv * 5.0) * 0.1;
            
            // Create radial gradient from glow position
            float dist = distance(vUv + n, uGlowPosition);
            float glow = smoothstep(1.2, 0.0, dist) * uGlowIntensity;
            vec3 finalColor = uGlowColor * glow * 0.12; 
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    transparent: false,
    depthWrite: false
});
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
bgMesh.position.z = -10;
scene.add(bgMesh);

// Custom shader material for metallic appearance with external lighting
const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    
    void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uBBoxMinY;
    uniform float uBBoxMaxY;
    uniform float uPulse; // High-intensity flash value
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    
    // Higher quality noise for smoother scattering
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f*f*(3.0-2.0*f);
        float n = i.x + i.y*57.0 + 113.0*i.z;
        return mix(mix(mix(hash(n+0.0), hash(n+1.0), f.x),
                       mix(hash(n+57.0), hash(n+58.0), f.x), f.y),
                   mix(mix(hash(n+113.0), hash(n+114.0), f.x),
                       mix(hash(n+170.0), hash(n+171.0), f.x), f.y), f.z);
    }
    
    // Multi-layered smooth noise for misty scattering
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100);
        for (int i = 0; i < 2; ++i) {
            v += a * noise(p);
            p = p * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }
    
    void main() {
        // Normalize Y position within bounding box
        float normalizedY = (vPosition.y - uBBoxMinY) / (uBBoxMaxY - uBBoxMinY);
        
        // External light sweeping from top to bottom
        float sweepPos = 1.0 - uTime;
        float sweepWidth = 1.3; // Even wider for softer feel
        
        // Multi-layered scattering for mist-like diffusion
        float scattering = fbm(vPosition * 1.5 + uTime * 0.2) * 0.12;
        
        // Main diffused light with smoother transitions
        float lightIntensity = smoothstep(sweepPos - sweepWidth, sweepPos, normalizedY + scattering) * 
                               smoothstep(sweepPos + sweepWidth, sweepPos, normalizedY - scattering);
        
        // --- NEW: Natural fade-out at the bottom edge ---
        float bottomFade = smoothstep(0.0, 0.15, normalizedY);
        lightIntensity *= bottomFade;
        
        // Lingering light intensity for edges (longer trail)
        float lingerWidth = 2.0;
        float edgeLinger = smoothstep(sweepPos - lingerWidth, sweepPos, normalizedY + scattering) * 
                           smoothstep(sweepPos + 0.8, sweepPos, normalizedY - scattering) * bottomFade;
        
        // Fresnel effect - stronger near edges for "outside-in" glow
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 1.25); // Softer but wider catch
        
        // Base color - REMOVED for selective visibility
        // vec3 baseColor = uColor * 0.03;
        
        // Specular highlight - extremely soft
        float specular = pow(max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
        
        // Increased internal diffuse light - strictly masked by lightIntensity
        vec3 diffuseLight = uColor * lightIntensity * 0.3;
        
        // Specular reflection - strictly masked by lightIntensity
        vec3 specularLight = vec3(1.0) * specular * lightIntensity * 0.1;
        
        // --- EDGE GLOW: Primary visibility source ---
        // strictly masked by edgeLinger
        vec3 outsideGlow = uColor * fresnel * 1.8 * edgeLinger;
        
        // Ambient occlusion for form definition (applied only to illuminated areas)
        float ao = pow(abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.2);
        
        // Final color mix - No baseColor, so it's black where no light hits
        // Enhanced by uPulse for momentary flash intensity
        vec3 finalColor = (diffuseLight + specularLight) * ao + outsideGlow;
        finalColor *= (1.0 + uPulse * 2.0);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Text management
const loader = new FontLoader();
let currentMesh = null;
let sequenceIndex = 0;
let startTime = 0;

function createMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0xffffff) },
            uBBoxMinY: { value: -1 },
            uBBoxMaxY: { value: 1 },
            uPulse: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        transparent: false, // Solid metal, not transparent
        side: THREE.DoubleSide
    });
}

loader.load(FONT_PATH, (font) => {
    function createLetter(char) {
        // Remove old letter completely before creating new one
        // Ensures only one letter visible at a time
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
            currentMesh = null;
        }

        const geometry = new TextGeometry(char, {
            font: font,
            size: 9.5, // Slightly larger
            height: 3.5, // Even thicker for massive gothic feel
            curveSegments: 32,
            bevelEnabled: true,
            bevelThickness: 0.5, // Deeper weight
            bevelSize: 0.3,
            bevelSegments: 16
        });

        // Balanced "heavy" proportions (reduced flatness)
        geometry.scale(1.2, 0.82, 1.0);

        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        // Create new material for this letter
        const letterMaterial = createMaterial();
        letterMaterial.uniforms.uBBoxMinY.value = geometry.boundingBox.min.y;
        letterMaterial.uniforms.uBBoxMaxY.value = geometry.boundingBox.max.y;

        // Random color from palette
        const colorValue = COLORS[Math.floor(Math.random() * COLORS.length)];
        letterMaterial.uniforms.uColor.value.setHex(colorValue);

        const mesh = new THREE.Mesh(geometry, letterMaterial);

        // Apply current rotation (persistent across letters)
        mesh.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);

        scene.add(mesh);
        currentMesh = mesh;
        startTime = performance.now();
    }

    // Initial letter
    createLetter(TEXT_SEQUENCE[sequenceIndex]);

    // Remove loading overlay once initialized
    const loading = document.getElementById('loading');
    if (loading) loading.style.opacity = '0';
    setTimeout(() => { if (loading) loading.remove(); }, 500);

    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const elapsed = now - startTime;

        // Total duration includes the "sweep" plus the "fade-out/linger" phase
        // Light clears completely when progress reaches roughly 1.85 (sweepPos < -0.85)
        const TRANSITION_THRESHOLD = 1.85;

        // Show letter during DISPLAY_DURATION * TRANSITION_THRESHOLD
        if (elapsed < DISPLAY_DURATION * TRANSITION_THRESHOLD) {
            if (currentMesh) {
                const progress = elapsed / DISPLAY_DURATION;
                // Update shader time for light sweep
                currentMesh.material.uniforms.uTime.value = progress;

                // Rotation logic
                if (isDragging) {
                    // Smoothly follow mouse
                } else {
                    // Apply damping (friction) to velocity
                    const damping = 0.985; // Slow decay
                    rotationVelocity.x *= damping;
                    rotationVelocity.y *= damping;
                    rotationVelocity.z *= damping;

                    // Maintain minimum ambient rotation (floor)
                    const floor = 0.0008;
                    if (Math.abs(rotationVelocity.x) < floor) rotationVelocity.x = Math.sign(rotationVelocity.x || 1) * floor;
                    if (Math.abs(rotationVelocity.y) < floor) rotationVelocity.y = Math.sign(rotationVelocity.y || 1) * floor;
                    if (Math.abs(rotationVelocity.z) < floor) rotationVelocity.z = Math.sign(rotationVelocity.z || 1) * floor;

                    // Apply current velocity
                    currentRotation.x += rotationVelocity.x;
                    currentRotation.y += rotationVelocity.y;
                    currentRotation.z += rotationVelocity.z;
                }

                currentMesh.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);

                // Pulse effect decay and application
                pulseValue *= 0.92; // Smooth decay
                if (pulseValue < 0.001) pulseValue = 0;

                // Apply pulse to scale and shader
                const scalePulse = 1.0 + pulseValue * 0.15;
                currentMesh.scale.set(1.2 * scalePulse, 0.82 * scalePulse, 1.0 * scalePulse);
                currentMesh.material.uniforms.uPulse.value = pulseValue;

                // Boost bloom during pulse
                bloomPass.strength = 0.6 + pulseValue * 1.5;

                // Update background glow based on light position and letter color
                const normalizedY = 1.0 - progress; // Top to bottom (1 to 0)
                bgMesh.material.uniforms.uGlowColor.value.copy(currentMesh.material.uniforms.uColor.value);
                // Ensure glow intensity doesn't go negative during tail fade
                const intensityProgress = progress < 0.8 ? progress * 0.6 : Math.max(0.0, (1.0 - progress) * 2.4);
                bgMesh.material.uniforms.uGlowIntensity.value = intensityProgress + pulseValue * 0.5;
                bgMesh.material.uniforms.uGlowPosition.value.set(0.5, normalizedY);
            }
        }
        // Remove letter and wait during BLANK_DURATION
        else if (elapsed < DISPLAY_DURATION * TRANSITION_THRESHOLD + BLANK_DURATION) {
            if (currentMesh) {
                scene.remove(currentMesh);
                currentMesh.geometry.dispose();
                currentMesh.material.dispose();
                currentMesh = null;
                bgMesh.material.uniforms.uGlowIntensity.value = 0; // Fade out background too
            }
        }
        // Move to next letter
        else {
            sequenceIndex = (sequenceIndex + 1) % TEXT_SEQUENCE.length;
            createLetter(TEXT_SEQUENCE[sequenceIndex]);
        }

        composer.render();
    }

    animate();
});

// Mouse Interaction
window.addEventListener('mousedown', (e) => {
    isDragging = true;
    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
    pulseValue = 1.0; // Trigger "boing" pulse
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - mousePosition.x;
    const deltaY = e.clientY - mousePosition.y;

    // Apply rotation based on mouse movement
    // Sensitivity lowered for "soft/slow" feel
    const sensitivity = 0.003;
    currentRotation.y += deltaX * sensitivity;
    currentRotation.x += deltaY * sensitivity;

    // Update velocity for momentum on release
    // Multiplier increased for significantly more "weight" and persistence
    rotationVelocity.x = deltaY * 0.002;
    rotationVelocity.y = deltaX * 0.002;

    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Responsiveness
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

