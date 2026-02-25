import { Cell } from "./Cell.js";
import { CellType } from "../Utilities/CellType.js";
import { MARKER_ORDER } from "../Utilities/MarkerOrder.js";
import { TCellConfig } from "../configs/TCellConfig.js";
import { CellMarker } from "../Utilities/CellMarker.js";

export class TCell extends Cell {
    constructor(x, y, size, marker, images) {
        super(
            x,
            y,
            size,
            CellType.T_CELL,
            marker,
            images
        );

        this.bindingTarget = null;
        this.bindingTimer = 0;

        this.lifeTime = TCellConfig.lifetime;
        this.age = 0;

        this.rejectedTargets = new Set();
        this.target = null;

        this.cars = [];
        this.maxCars = 1;

        this.idleAngle = Math.random() * Math.PI * 2;
        this.idleTurnSpeed = 0.3 + Math.random() * 0.4;

        this.pulseTime = 0;
        this.isHovered = false;

        this.upgrades = {
            speed: false,
            lifetime: 1,
            chainReaction: false
        }

        this.impulseX = 0;
        this.impulseY = 0;
        this.impulseDecay = 3.5; // higher = faster settle

        this.wanderTarget = null;
        this.wanderPauseTimer = 0;
        this.wanderState = "moving";

        this.retargetCooldown = 0;

        //chain reaction visuals
        this.bursting = false;
        this.burstTimer = 0;
        this.burstDuration = 0.25;

        this.velX = 0;
        this.velY = 0;
        this.accelerationSharpness = 4; // higher = snappier start
    }

    update(width, height, deltaTime) {
        if (this.bursting) {
            this.burstTimer += deltaTime;

            const t = Math.min(this.burstTimer / this.burstDuration, 1);

            // Ease-out scale pop
            const burstScale = 1 + 0.3 * (1 - t);
            this.scale = burstScale;

            // Strong glow
            this.opacity = 1;

            if (t >= 1) {
                this.bursting = false;
                this.dying = true;
            }

            return;
        }

        this.spawning(deltaTime);
        //if(this.isSpawning) return;

        //this.impulseX *= 0.95;
        //this.impulseY *= 0.95;

        // inject impulse into velocity
        if (Math.hypot(this.impulseX, this.impulseY) > 1) {
            this.velX += this.impulseX * deltaTime;
            this.velY += this.impulseY * deltaTime;
        }

        const speed = Math.hypot(this.velX, this.velY);
        const velocityThreshold = 5;

        if (speed > velocityThreshold) {
            this.velX += (this.impulseX - this.velX)
                * this.accelerationSharpness * deltaTime;

            this.velY += (this.impulseY - this.velY)
                * this.accelerationSharpness * deltaTime;

            // move
            this.x += this.velX * deltaTime;
            this.y += this.velY * deltaTime;

            // damping
            const damping = 1.2;
            this.velX *= Math.exp(-damping * deltaTime);
            this.velY *= Math.exp(-damping * deltaTime);

            // decay impulse
            this.impulseX *= 0.9;
            this.impulseY *= 0.9;

            return;
        }

        super.update(width, height, deltaTime);

        this.age += deltaTime;
        this.retargetCooldown -= deltaTime;

        if (this.age >= this.lifeTime) {
            this.dying = true;
            return;
        }

        const hasTarget = this.target !== null;
        const hasMarker = this.hasActiveMarker();

        if (!hasMarker) {
            this.idleBorderMovement(width, height, deltaTime);
            return;
        }

        if (this.bindingTarget) {
            this.vx *= 0.9;
            this.vy *= 0.9;
            return;
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0.001) {
                this.vx = dx / dist;
                this.vy = dy / dist;
            }
        }

        let effectiveSpeed = TCellConfig.baseSpeed;
        if(this.upgrades.speed) effectiveSpeed *= TCellConfig.upgradeSpeedMultiplier;

        if (this.type === CellType.T_CELL && this.target) { effectiveSpeed *= TCellConfig.chaseSpeedMultiplier; }

        this.x += this.vx * effectiveSpeed * deltaTime;
        this.y += this.vy * effectiveSpeed * deltaTime;

        // bounds
        if (this.x < this.size / 2 || this.x > width - this.size / 2) {
            this.vx *= -1;
        }
        if (this.y < this.size / 2 || this.y > height - this.size / 2) {
            this.vy *= -1;
        }
    }

    draw(ctx) {
        ctx.save();

        ctx.globalAlpha = this.opacity;

        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);

        let pulseScale = this.scale;

        if (this.isHovered) {
            const pulse = 1 + Math.sin(this.age * 6) * 0.06; // speed + strength
            pulseScale *= pulse;

            ctx.shadowColor = "rgba(255,255,255,0.5)";
            ctx.shadowBlur = 14;
        }
/*
        if (this.playerOverrideTime > 0) {
            ctx.shadowColor = "rgba(120,200,255,0.8)";
            ctx.shadowBlur = 18;
        }*/

        if (this.bursting) {
            ctx.shadowColor = "rgba(255, 200, 50, 1)";
            ctx.shadowBlur = 30;
        }

        ctx.scale(pulseScale, pulseScale);

        // draw base cell image
        const img = this.images[this.type]?.[this.marker];
        if (img) {
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(
                img,
                -this.size / 2,
                -this.size / 2,
                this.size,
                this.size
            );
        }

        ctx.restore();
    }

    idleBorderMovement(width, height, deltaTime) {

        const margin = this.size * 2;

        // If no target, pick one
        if (!this.wanderTarget) {
            this.wanderTarget = {
                x: margin + Math.random() * (width - margin * 2),
                y: margin + Math.random() * (height - margin * 2)
            };
        }

        // If paused
        if (this.wanderState === "paused") {
            this.wanderPauseTimer -= deltaTime;

            if (this.wanderPauseTimer <= 0) {
                this.wanderState = "moving";
                this.wanderTarget = null; // force new destination
            }

            return;
        }

        // Move toward target
        const dx = this.wanderTarget.x - this.x;
        const dy = this.wanderTarget.y - this.y;
        const dist = Math.hypot(dx, dy);

        let effectiveSpeed = TCellConfig.baseSpeed;
        if(this.upgrades.speed) effectiveSpeed *= TCellConfig.upgradeSpeedMultiplier;

        if (dist < 5) {
            // Arrived → pause
            this.wanderState = "paused";
            this.wanderPauseTimer = 0.5 + Math.random() * 1.2; // random pause
            return;
        }

        // Normalize direction
        const dirX = dx / dist;
        const dirY = dy / dist;

        this.x += dirX * effectiveSpeed * deltaTime;
        this.y += dirY * effectiveSpeed * deltaTime;
    }

    hasActiveMarker() {
        return this.marker !== CellMarker.NONE;
    }

    applyUpgrade(type) {
        console.log("applying upgrade of type" + type);
        switch (type) {
            case "SPEED":
                if(!this.upgrades.speed){
                    this.upgrades.speed = true;
                }
                break;

            case "CHAINREACTION":
                this.upgrades.chainReaction = true;
                console.log("upgrades.chainreaction =" + this.upgrades.chainReaction);
                break;
            
            case "LIFETIME":
                this.lifeTime *= TCellConfig.upgradeLifetimeMultiplier;
                break;
        }
    }

    applyCar(car) {
        if (this.cars.length >= this.maxCars) return false;

        // prevent duplicate markers
        if (this.cars.some(c => c.marker === car.marker)) return false;

        this.cars.push({ marker: car.marker });

        this.setMarker(car.marker);

        return true;
    }

    cycleMarker() {
        const i = MARKER_ORDER.indexOf(this.marker);
        this.setMarker(MARKER_ORDER[(i + 1) % MARKER_ORDER.length]);

        if (this.target && this.target.marker !== this.marker) {
            this.clearTarget();
        }
    }

    setMarker(newMarker) {
        if (this.marker === newMarker) return;

        this.marker = newMarker;

        // HARD RESET of interaction state
        this.clearTarget();
        this.bindingTarget = null;
        this.bindingTimer = 0;
        this.rejectedTargets.clear();
    }

    setTarget(target) {
        this.target = target;
    }

    clearTarget() {
        this.target = null;
    }
}