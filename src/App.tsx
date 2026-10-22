import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";

type Controls = {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchRef = useRef<Controls>({
    accelerate: false,
    brake: false,
    left: false,
    right: false,
  });
  const restartRef = useRef<() => void>(() => {});
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("READY TO RACE");
  const [score, setScore] = useState(0);
  const raceLength = 3000;

  function setTouchControl(control: keyof Controls, pressed: boolean) {
    touchRef.current[control] = pressed;
  }

  function restartGame() {
    restartRef.current();
  }

  function startGame() {
    startedRef.current = true;
    finishedRef.current = false;
    setGameStarted(true);
    setGameOver(false);
    setFinished(false);
    setMessage("RACE STARTED");
  }

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ---------- Scene ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#91c9ef");
    scene.fog = new THREE.Fog("#91c9ef", 90, 330);

    const camera = new THREE.PerspectiveCamera(
      65,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // ---------- Lighting ----------
    scene.add(new THREE.HemisphereLight("#e8f6ff", "#526345", 2));

    const sun = new THREE.DirectionalLight("#fff4dc", 3);
    sun.position.set(-20, 35, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    scene.add(sun);

    // ---------- Materials and helpers ----------
    function material(
      color: string,
      roughness = 0.8,
      metalness = 0
    ) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
      });
    }

    function box(
      parent: THREE.Object3D,
      width: number,
      height: number,
      depth: number,
      color: string,
      x: number,
      y: number,
      z: number,
      roughness = 0.75,
      metalness = 0
    ) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material(color, roughness, metalness)
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    // ---------- Environment ----------
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 1800),
      material("#568348")
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.08, -650);
    grass.receiveShadow = true;
    scene.add(grass);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 1800),
      material("#343941", 0.95)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -650);
    road.receiveShadow = true;
    scene.add(road);

    // Roadside lines
    for (const x of [-5.65, 5.65]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.025, 1800),
        material("#f5f5e9")
      );
      edge.position.set(x, 0.025, -650);
      scene.add(edge);
    }

    // Dashed center lines
    for (let z = 10; z > -1530; z -= 12) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.035, 5.5),
        material("#f7f2d7")
      );
      dash.position.set(0, 0.035, z);
      scene.add(dash);
    }

    // ---------- Finish line gate ----------
    // The gate starts far ahead and moves toward the player as the race progresses.
    const finishGate = new THREE.Group();

    // Checkered finish stripe across the road.
    for (let i = 0; i < 16; i++) {
      const x = -5.625 + i * 0.75;
      box(
        finishGate,
        0.75,
        0.06,
        0.9,
        i % 2 === 0 ? "#ffffff" : "#17191d",
        x,
        0.07,
        0
      );
    }

    // Finish-line arch and overhead checkered banner.
    box(finishGate, 0.22, 3.4, 0.22, "#f5f5f5", -5.85, 1.7, 0);
    box(finishGate, 0.22, 3.4, 0.22, "#f5f5f5", 5.85, 1.7, 0);
    box(finishGate, 12, 0.22, 0.3, "#e9edf0", 0, 3.35, 0);

    for (let i = 0; i < 16; i++) {
      box(
        finishGate,
        0.75,
        0.48,
        0.12,
        i % 2 === 0 ? "#17191d" : "#ffffff",
        -5.625 + i * 0.75,
        3.0,
        0.18
      );
    }

    finishGate.position.set(0, 0, -1400);
    scene.add(finishGate);

    // Roadside barriers
    for (const side of [-1, 1]) {
      box(scene, 0.35, 0.65, 1600, "#c6cbd0", side * 6.35, 0.32, -650);
      for (let z = 10; z > -1500; z -= 12) {
        box(
          scene,
          0.39,
          0.67,
          5.5,
          z % 24 === 10 ? "#e9edf0" : "#e04b42",
          side * 6.35,
          0.34,
          z
        );
      }
    }

    // Trees made from trunks and cones
    const treePositions: { x: number; z: number; group: THREE.Group }[] = [];
    for (let z = 5; z > -1500; z -= 18) {
      for (const side of [-1, 1]) {
        const x = side * (10 + Math.random() * 12);
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.28, 2.5, 8),
          material("#65452f")
        );
        trunk.position.y = 1.25;
        trunk.castShadow = true;
        tree.add(trunk);
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(1.65, 4.4, 8),
          material(Math.random() > 0.5 ? "#286642" : "#347b4a")
        );
        leaves.position.y = 3.9;
        leaves.castShadow = true;
        tree.add(leaves);
        tree.position.set(x, 0, z - Math.random() * 8);
        scene.add(tree);
        treePositions.push({ x, z: tree.position.z, group: tree });
      }
    }

    // ---------- Sports car ----------
    const car = new THREE.Group();
    scene.add(car);

    box(car, 1.95, 0.48, 3.85, "#d71935", 0, 0.65, 0, 0.28, 0.55);
    box(car, 1.72, 0.22, 1.18, "#ed2942", 0, 0.88, -1.18, 0.3, 0.5);
    box(car, 1.98, 0.2, 0.24, "#24282d", 0, 0.43, -1.98);
    box(car, 1.98, 0.2, 0.24, "#24282d", 0, 0.43, 1.98);

    // Cabin
    box(car, 1.4, 0.68, 1.8, "#203849", 0, 1.12, 0.12, 0.18, 0.4);
    box(car, 1.18, 0.12, 1.28, "#bd2035", 0, 1.5, 0.12, 0.3, 0.5);

    // Side skirts, mirrors and spoiler
    for (const side of [-1, 1]) {
      box(car, 0.12, 0.18, 2.35, "#24272b", side * 0.98, 0.43, 0);
      box(car, 0.23, 0.12, 0.22, "#d71935", side * 0.85, 1.02, -0.62);
      box(car, 0.12, 0.36, 0.12, "#292d32", side * 0.58, 1.02, 1.55);
    }
    box(car, 1.55, 0.12, 0.36, "#d71935", 0, 1.23, 1.58, 0.3, 0.5);

    // Lights
    for (const x of [-0.58, 0.58]) {
      box(car, 0.38, 0.12, 0.06, "#fff2bf", x, 0.76, -2.02, 0.2);
      box(car, 0.38, 0.12, 0.06, "#ff263e", x, 0.76, 2.02, 0.2);
    }

    // Wheels
    const wheels: THREE.Group[] = [];
    const frontWheels: THREE.Group[] = [];
    const tireGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.27, 24);
    const rimGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.29, 16);
    const hubGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.31, 12);
    const tireMaterial = material("#15171a", 0.9);
    const rimMaterial = material("#bdc5ce", 0.25, 0.85);

    for (const x of [-1, 1]) {
      for (const z of [-1.25, 1.25]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, 0.4, z);
        car.add(wheel);

        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wheel.add(tire);

        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        wheel.add(rim);

        const hub = new THREE.Mesh(hubGeometry, rimMaterial);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);

        wheels.push(wheel);
        if (z < 0) frontWheels.push(wheel);
      }
    }

    // Car shadow
    const carShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 4.5),
      new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      })
    );
    carShadow.rotation.x = -Math.PI / 2;
    carShadow.position.set(0, 0.025, 0.1);
    car.add(carShadow);

    // ---------- Obstacles ----------
    type Obstacle = { mesh: THREE.Group; x: number; z: number; kind: "car" | "cone" | "crate"; drift: number; phase: number };
    const obstacles: Obstacle[] = [];

    for (let i = 0; i < 24; i++) {
      const obstacle = new THREE.Group();
      const lane = [-3.7, 0, 3.7][Math.floor(Math.random() * 3)];
      const x = lane;
      const z = -42 - i * 32;
      const kind: Obstacle["kind"] = i % 4 === 0 ? "car" : i % 3 === 0 ? "cone" : "crate";
      let drift = kind === "car" ? (Math.random() - 0.5) * 0.65 : 0;

      if (kind === "car") {
        const traffic = new THREE.Group();
        box(traffic, 1.72, 0.5, 3.35, ["#2474d2", "#f1f1f1", "#f3b51b", "#24282d", "#28a879"][i % 5], 0, 0.62, 0, 0.3, 0.35);
        box(traffic, 1.28, 0.62, 1.5, "#263b4c", 0, 1.12, -0.1, 0.2, 0.25);
        for (const wx of [-0.9, 0.9]) {
          for (const wz of [-1.05, 1.05]) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14), tireMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.32, wz);
            traffic.add(wheel);
          }
        }
        for (const lx of [-0.48, 0.48]) {
          box(traffic, 0.24, 0.1, 0.05, "#ffefb0", lx, 0.7, -1.7);
          box(traffic, 0.24, 0.1, 0.05, "#f04444", lx, 0.7, 1.7);
        }
        obstacle.add(traffic);
      } else if (kind === "cone") {
        // Traffic cone
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.48, 1.15, 12),
          material("#ff7b22", 0.65)
        );
        cone.position.y = 0.58;
        cone.castShadow = true;
        obstacle.add(cone);

        box(obstacle, 0.95, 0.12, 0.95, "#eeeeee", 0, 0.06, 0);
      } else {
        // Road obstacle / crate
        box(obstacle, 1.05, 1.1, 1.05, "#e9a23b", 0, 0.55, 0);
        box(obstacle, 1.08, 0.13, 1.08, "#343941", 0, 0.55, 0);
      }

      obstacle.position.set(x, 0, z);
      scene.add(obstacle);
      obstacles.push({ mesh: obstacle, x, z, kind, drift, phase: Math.random() * Math.PI * 2 });
    }

    // ---------- Driving state ----------
    const clock = new THREE.Clock();
    let velocity = 0;
    let travelled = 0;
    let steering = 0;
    let crashed = false;
    let animationId = 0;
    let lastHudUpdate = 0;

    car.position.set(0, 0, 0);

    restartRef.current = () => {
      velocity = 0;
      travelled = 0;
      steering = 0;
      crashed = false;
      car.position.set(0, 0, 0);
      startedRef.current = false;
      finishedRef.current = false;
      setGameStarted(false);
      setFinished(false);
      setScore(0);
      car.rotation.set(0, 0, 0);

      obstacles.forEach((obstacle, index) => {
        obstacle.z = -42 - index * 32;
        obstacle.x = [-3.7, 0, 3.7][Math.floor(Math.random() * 3)];
        obstacle.mesh.position.set(obstacle.x, 0, obstacle.z);
      });
      treePositions.forEach((tree) => {
        tree.z = -Math.random() * 1450;
        tree.group.position.z = tree.z;
      });

      keysRef.current = {};
      touchRef.current = {
        accelerate: false,
        brake: false,
        left: false,
        right: false,
      };

      setSpeed(0);
      setDistance(0);
      setGameOver(false);
      setMessage("READY TO RACE");
    };

    // ---------- Keyboard controls ----------
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
      ) {
        event.preventDefault();
      }
      keysRef.current[key] = true;

      if (key === "r" && crashed) {
        restartRef.current();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
      touchRef.current = {
        accelerate: false,
        brake: false,
        left: false,
        right: false,
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    // ---------- Game loop ----------
    function animate() {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const keys = keysRef.current;
      const touch = touchRef.current;

      const accelerate =
        keys["arrowup"] || keys["w"] || touch.accelerate;
      const brake = keys["arrowdown"] || keys["s"] || touch.brake;
      const left = keys["arrowleft"] || keys["a"] || touch.left;
      const right = keys["arrowright"] || keys["d"] || touch.right;

      if (!crashed && startedRef.current && !finishedRef.current) {
        if (accelerate) velocity += 20 * delta;
        else velocity -= 4.5 * delta;

        if (brake) velocity -= 27 * delta;
        velocity = THREE.MathUtils.clamp(velocity, 0, 48);

        const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
        steering = THREE.MathUtils.lerp(
          steering,
          steerInput,
          Math.min(1, delta * 7)
        );

        // Steering becomes stronger as speed increases.
        car.position.x += steering * delta * (2.2 + velocity * 0.18);
        car.position.x = THREE.MathUtils.clamp(car.position.x, -4.65, 4.65);

        travelled += velocity * delta;

        // Bring the visible finish gate closer in proportion to race progress.
        finishGate.position.z = -1400 + (Math.min(travelled, raceLength) / raceLength) * 1400;

        if (travelled >= raceLength) {
          travelled = raceLength;
          velocity = 0;
          finishedRef.current = true;
          setFinished(true);
          setMessage("FINISH LINE");
        }

        // Lean the car slightly while turning.
        car.rotation.z = THREE.MathUtils.lerp(
          car.rotation.z,
          -steering * 0.08,
          Math.min(1, delta * 5)
        );

        // Rotate the wheels.
        for (const wheel of wheels) {
          wheel.rotation.x -= (velocity * delta) / 0.38;
        }

        for (const wheel of frontWheels) {
          wheel.rotation.y = THREE.MathUtils.lerp(
            wheel.rotation.y,
            -steering * 0.28,
            Math.min(1, delta * 8)
          );
        }

        // Move obstacles toward the player to simulate an endless road.
        for (const obstacle of obstacles) {
          obstacle.z += velocity * delta;
          obstacle.phase += delta * (1.2 + velocity * 0.05);
          if (obstacle.kind === "car") {
            obstacle.x += Math.sin(obstacle.phase) * obstacle.drift * delta;
            obstacle.x = THREE.MathUtils.clamp(obstacle.x, -4.05, 4.05);
          }

          if (obstacle.z > 9) {
            obstacle.z = -760 - Math.random() * 120;
            obstacle.x = [-3.7, 0, 3.7][Math.floor(Math.random() * 3)];
            obstacle.mesh.rotation.y = 0;
          }
          obstacle.mesh.position.set(obstacle.x, 0, obstacle.z);

          // Hitboxes are deliberately wider for traffic than small cones.
          const halfWidth = obstacle.kind === "car" ? 1.55 : obstacle.kind === "crate" ? 1.15 : 0.9;
          const halfDepth = obstacle.kind === "car" ? 2.15 : 1.3;
          if (
            Math.abs(obstacle.z) < halfDepth + 1.55 &&
            Math.abs(obstacle.x - car.position.x) < halfWidth + 0.82
          ) {
            crashed = true;
            velocity = 0;
            setGameOver(true);
            setMessage("CRASH! RESTART TO TRY AGAIN");
            break;
          }
        }

        // The roadside scenery scrolls past to sell the sense of forward motion.
        for (const tree of treePositions) {
          tree.z += velocity * delta;
          if (tree.z > 18) tree.z -= 1500;
          tree.group.position.z = tree.z;
        }

        if (!crashed && travelled > 0 && travelled < raceLength) {
          setMessage("RACE IN PROGRESS");
        }
      } else {
        velocity = 0;
      }

      // Camera follows from behind and above.
      const targetCamera = new THREE.Vector3(
        car.position.x * 0.55,
        5.4,
        car.position.z + 9.5
      );
      camera.position.lerp(targetCamera, Math.min(1, delta * 4.5));
      camera.lookAt(car.position.x * 0.35, 0.9, car.position.z - 8);

      // Keep the world visible far ahead.
      renderer.render(scene, camera);

      if (clock.elapsedTime - lastHudUpdate > 0.1) {
        setSpeed(Math.round((velocity / 48) * 240));
        setDistance(Math.floor(travelled));
        setScore(Math.floor(travelled * 10 + Math.max(0, velocity) * 2));
        lastHudUpdate = clock.elapsedTime;
      }
    }

    animate();

    // ---------- Resize ----------
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // ---------- Cleanup ----------
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();

          if (Array.isArray(object.material)) {
            object.material.forEach((item) => item.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-canvas" />

      <header className="top-hud">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <div>
            <h1>SPEED RUSH</h1>
            <p>3D STREET RACING</p>
          </div>
        </div>

        <div className={`status-pill ${gameOver ? "danger" : ""}`}>
          <span className="status-dot" />
          {message}
        </div>
      </header>

      <section className="speed-panel">
        <p className="panel-label">CURRENT SPEED</p>
        <div className="speed-number">
          {String(speed).padStart(3, "0")}
          <span>KM/H</span>
        </div>
        <div className="speed-track">
          <div
            className="speed-fill"
            style={{ width: `${Math.min(100, (speed / 240) * 100)}%` }}
          />
        </div>
        <div className="speed-footer">
          <span>0</span>
          <span>120</span>
          <span>240</span>
        </div>
      </section>

      <section className="race-info">
        <div>
          <span className="info-label">DISTANCE</span>
          <strong>{distance} <small>/ {raceLength} m</small></strong>
          <div className="race-progress"><span style={{ width: `${Math.min(100, (distance / raceLength) * 100)}%` }} /></div>
        </div>
        <div>
          <span className="info-label">SCORE</span>
          <strong>{score.toLocaleString()}</strong>
          <small className="track-name">COASTLINE • STAGE 01</small>
        </div>
      </section>

      {!gameStarted && !gameOver && !finished && (
        <div className="start-overlay">
          <div className="start-card">
            <p className="eyebrow">STREET RACING CHALLENGE</p>
            <h2>READY, DRIVER?</h2>
            <p>Dodge traffic, cones and roadblocks. Reach the finish line without a collision.</p>
            <div className="start-stats"><span>🏁 3 KM RACE</span><span>★ SCORE POINTS</span><span>📱 TOUCH READY</span></div>
            <button className="restart-button" onClick={startGame}>▶ START RACE</button>
          </div>
        </div>
      )}

      {finished && (
        <div className="game-over finish-overlay">
          <div className="game-over-card">
            <div className="crash-icon finish-icon">🏆</div>
            <p className="eyebrow finish-eyebrow">RACE COMPLETED</p>
            <h2>FINISH!</h2>
            <p>You reached the finish line. Final score: <strong>{score.toLocaleString()}</strong></p>
            <button className="restart-button" onClick={restartGame}>↻ RACE AGAIN</button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="game-over">
          <div className="game-over-card">
            <div className="crash-icon">!</div>
            <p className="eyebrow">RACE INTERRUPTED</p>
            <h2>CRASHED!</h2>
            <p>You collided with traffic or a road obstacle. Your run has ended.</p>
            <p className="final-score">FINAL SCORE: {score.toLocaleString()}</p>
            <button className="restart-button" onClick={restartGame}>
              ↻ RESTART RACE
            </button>
          </div>
        </div>
      )}

      <div className="control-hint">
        <span>W / ↑</span> ACCELERATE
        <span className="hint-divider">•</span>
        <span>S / ↓</span> BRAKE
        <span className="hint-divider">•</span>
        <span>A D / ← →</span> STEER
      </div>

      <div className="mobile-controls">
        <div className="steering-controls">
          <button
            className="control-button steer-button"
            aria-label="Steer left"
            onPointerDown={() => setTouchControl("left", true)}
            onPointerUp={() => setTouchControl("left", false)}
            onPointerLeave={() => setTouchControl("left", false)}
            onPointerCancel={() => setTouchControl("left", false)}
          >
            ←
          </button>
          <button
            className="control-button steer-button"
            aria-label="Steer right"
            onPointerDown={() => setTouchControl("right", true)}
            onPointerUp={() => setTouchControl("right", false)}
            onPointerLeave={() => setTouchControl("right", false)}
            onPointerCancel={() => setTouchControl("right", false)}
          >
            →
          </button>
        </div>

        <div className="pedal-controls">
          <button
            className="control-button brake-button"
            onPointerDown={() => setTouchControl("brake", true)}
            onPointerUp={() => setTouchControl("brake", false)}
            onPointerLeave={() => setTouchControl("brake", false)}
            onPointerCancel={() => setTouchControl("brake", false)}
          >
            BRAKE
          </button>
          <button
            className="control-button gas-button"
            onPointerDown={() => setTouchControl("accelerate", true)}
            onPointerUp={() => setTouchControl("accelerate", false)}
            onPointerLeave={() => setTouchControl("accelerate", false)}
            onPointerCancel={() => setTouchControl("accelerate", false)}
          >
            GAS ↑
          </button>
        </div>
      </div>

      <footer className="game-footer">
       
        <span>MADE BY MANISHA PAUL</span>
      </footer>
    </main>
  );
}
