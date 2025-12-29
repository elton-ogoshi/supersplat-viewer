import { Vec3 } from 'playcanvas';

import type { Camera, CameraFrame } from './camera';
import { CameraController } from './camera';
import { AnimState } from '../animation/anim-state';
import { AnimTrack } from '../settings';

class AnimController implements CameraController {
    animState: AnimState;

    // Base position/target for hover effect
    basePosition: Vec3 = new Vec3();
    baseTarget: Vec3 = new Vec3();

    // Hover effect parameters
    hoverTime: number = 0;
    hoverAmplitude: number = 0.02;
    hoverSpeed: number = 0.5;

    // Smooth transition between keyframes
    isTransitioning: boolean = false;
    transitionProgress: number = 0;
    transitionDuration: number = 0.8;
    transitionFromPos: Vec3 = new Vec3();
    transitionFromTarget: Vec3 = new Vec3();
    transitionToPos: Vec3 = new Vec3();
    transitionToTarget: Vec3 = new Vec3();

    constructor(animTrack: AnimTrack) {
        this.animState = AnimState.fromTrack(animTrack);
        this.animState.update(0);
        // Initialize base position
        this.basePosition.copy(this.animState.position);
        this.baseTarget.copy(this.animState.target);
    }

    onEnter(camera: Camera): void {
        // snap camera to start position
        camera.look(this.animState.position, this.animState.target);
    }

    // Ease out cubic for smooth deceleration
    easeOutCubic(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    update(deltaTime: number, inputFrame: CameraFrame, camera: Camera, isPaused: boolean = false) {
        // Handle smooth transition between keyframes
        if (this.isTransitioning) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.isTransitioning = false;
                this.basePosition.copy(this.transitionToPos);
                this.baseTarget.copy(this.transitionToTarget);
            }

            const t = this.easeOutCubic(this.transitionProgress);

            // Lerp position and target
            const currentPos = new Vec3(
                this.transitionFromPos.x + (this.transitionToPos.x - this.transitionFromPos.x) * t,
                this.transitionFromPos.y + (this.transitionToPos.y - this.transitionFromPos.y) * t,
                this.transitionFromPos.z + (this.transitionToPos.z - this.transitionFromPos.z) * t
            );
            const currentTarget = new Vec3(
                this.transitionFromTarget.x + (this.transitionToTarget.x - this.transitionFromTarget.x) * t,
                this.transitionFromTarget.y + (this.transitionToTarget.y - this.transitionFromTarget.y) * t,
                this.transitionFromTarget.z + (this.transitionToTarget.z - this.transitionFromTarget.z) * t
            );

            // Apply hover on top of transition
            this.hoverTime += deltaTime;
            const hoverX = Math.sin(this.hoverTime * this.hoverSpeed) * this.hoverAmplitude;
            const hoverY = Math.sin(this.hoverTime * this.hoverSpeed * 0.7 + 1.0) * this.hoverAmplitude * 0.5;
            const hoverZ = Math.cos(this.hoverTime * this.hoverSpeed * 0.5) * this.hoverAmplitude * 0.3;

            const hoveredPos = new Vec3(
                currentPos.x + hoverX,
                currentPos.y + hoverY,
                currentPos.z + hoverZ
            );

            camera.look(hoveredPos, currentTarget);
        } else if (isPaused) {
            // Hovering movement when paused
            this.hoverTime += deltaTime;
            const hoverX = Math.sin(this.hoverTime * this.hoverSpeed) * this.hoverAmplitude;
            const hoverY = Math.sin(this.hoverTime * this.hoverSpeed * 0.7 + 1.0) * this.hoverAmplitude * 0.5;
            const hoverZ = Math.cos(this.hoverTime * this.hoverSpeed * 0.5) * this.hoverAmplitude * 0.3;

            // Apply hover offset to base position
            const hoveredPos = new Vec3(
                this.basePosition.x + hoverX,
                this.basePosition.y + hoverY,
                this.basePosition.z + hoverZ
            );

            camera.look(hoveredPos, this.baseTarget);
        } else {
            // Normal animation playback
            this.animState.update(deltaTime);
            // Update base position for when we pause
            this.basePosition.copy(this.animState.position);
            this.baseTarget.copy(this.animState.target);
            // update camera pose
            camera.look(this.animState.position, this.animState.target);
        }

        // ignore input
        inputFrame.read();
    }

    next() {
        // Store current position as transition start
        this.transitionFromPos.copy(this.basePosition);
        this.transitionFromTarget.copy(this.baseTarget);

        // Get next keyframe position
        this.animState.cursor.value = this.animState.getNextKeyframe(this.animState.cursor.value);
        this.animState.update(0);

        // Store target position
        this.transitionToPos.copy(this.animState.position);
        this.transitionToTarget.copy(this.animState.target);

        // Start transition
        this.isTransitioning = true;
        this.transitionProgress = 0;
    }

    prev() {
        // Store current position as transition start
        this.transitionFromPos.copy(this.basePosition);
        this.transitionFromTarget.copy(this.baseTarget);

        // Get prev keyframe position
        this.animState.cursor.value = this.animState.getPrevKeyframe(this.animState.cursor.value);
        this.animState.update(0);

        // Store target position
        this.transitionToPos.copy(this.animState.position);
        this.transitionToTarget.copy(this.animState.target);

        // Start transition
        this.isTransitioning = true;
        this.transitionProgress = 0;
    }

    onExit(camera: Camera): void {

    }
}

export { AnimController };
