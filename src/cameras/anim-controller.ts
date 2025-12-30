import { Vec3 } from 'playcanvas';
import type { Camera, CameraFrame } from './camera';
import { CameraController } from './camera';
import { AnimState } from '../animation/anim-state';
import { AnimTrack } from '../settings';

class AnimController implements CameraController {
    animState: AnimState;

    // Transition state
    private isTransitioning = false;
    private transitionDuration = 0.8;
    private transitionTimer = 0;
    private transitionFromPos = new Vec3();
    private transitionFromTarget = new Vec3();
    private transitionToPos = new Vec3();
    private transitionToTarget = new Vec3();

    // Base position for hover effect
    private basePosition = new Vec3();
    private baseTarget = new Vec3();

    // Hover effect state
    private hoverTime = 0;
    private hoverAmplitude = 0.4;       // Lateral movement strength (higher = more sway)
    private hoverCycleDuration = 30;    // Seconds for one full lateral cycle (higher = slower)
    private zoomAmplitude = 0.3;        // Zoom in/out strength
    private zoomCycleDuration = 20;     // Seconds for one full zoom cycle

    constructor(animTrack: AnimTrack) {
        this.animState = AnimState.fromTrack(animTrack);
        this.animState.update(0);
        this.basePosition.copy(this.animState.position);
        this.baseTarget.copy(this.animState.target);
    }

    onEnter(camera: Camera): void {
        // snap camera to start position
        camera.look(this.animState.position, this.animState.target);
        this.basePosition.copy(this.animState.position);
        this.baseTarget.copy(this.animState.target);
    }

    update(deltaTime: number, inputFrame: CameraFrame, camera: Camera, isPaused = false) {
        // Update hover time
        this.hoverTime += deltaTime;

        if (this.isTransitioning) {
            // Update transition
            this.transitionTimer += deltaTime;
            const t = Math.min(1, this.transitionTimer / this.transitionDuration);
            // Smooth easing (ease-in-out cubic)
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Interpolate position and target
            const pos = new Vec3().lerp(this.transitionFromPos, this.transitionToPos, ease);
            const target = new Vec3().lerp(this.transitionFromTarget, this.transitionToTarget, ease);

            // Apply hover effect on top of transition
            if (isPaused) {
                this.applyHover(pos, target);
            }

            camera.look(pos, target);

            if (t >= 1) {
                this.isTransitioning = false;
                this.basePosition.copy(this.transitionToPos);
                this.baseTarget.copy(this.transitionToTarget);
            }
        } else if (isPaused) {
            // When paused, apply subtle hover effect
            const pos = new Vec3().copy(this.basePosition);
            const target = new Vec3().copy(this.baseTarget);
            this.applyHover(pos, target);
            camera.look(pos, target);
        } else {
            // Normal animation playback
            this.animState.update(deltaTime);
            camera.look(this.animState.position, this.animState.target);
            this.basePosition.copy(this.animState.position);
            this.baseTarget.copy(this.animState.target);
        }

        // ignore input
        inputFrame.read();
    }

    private applyHover(pos: Vec3, target: Vec3) {
        // Lateral hover (X and Y sway)
        const hoverX = Math.sin((this.hoverTime / this.hoverCycleDuration) * Math.PI * 2) * this.hoverAmplitude;
        const hoverY = Math.cos((this.hoverTime / this.hoverCycleDuration) * 0.7 * Math.PI * 2) * this.hoverAmplitude * 0.5;
        pos.x += hoverX;
        pos.y += hoverY;

        // Zoom in/out effect (move along camera-to-target direction)
        const zoom = Math.sin((this.hoverTime / this.zoomCycleDuration) * Math.PI * 2) * this.zoomAmplitude;
        const dir = new Vec3().sub2(target, pos).normalize();
        pos.add(dir.mulScalar(zoom));
    }

    next() {
        // Store current position for transition
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
        this.transitionTimer = 0;
    }

    prev() {
        // Store current position for transition
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
        this.transitionTimer = 0;
    }

    onExit(camera: Camera): void {

    }
}

export { AnimController };
