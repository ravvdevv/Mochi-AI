
import React, { useRef, useEffect, useCallback } from 'react';
import { Expression, Mode } from '../types';
import { audioService } from '../services/audioService';

interface MochiCanvasProps {
  expression: Expression;
  mode: Mode;
}

const DISCO_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000', '#ffffff'];

const MochiCanvas: React.FC<MochiCanvasProps> = ({ expression, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const lastFrameTime = useRef<number>(performance.now());
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastExpression = useRef<Expression>(expression);
  
  const springState = useRef({
    eyeSize: { val: 40, target: 40, vel: 0, stiffness: 0.12, damping: 0.82 },
    squash: { val: 1, target: 1, vel: 0, stiffness: 0.12, damping: 0.85 },
    faceYOffset: { val: 0, target: 0, vel: 0, stiffness: 0.07, damping: 0.88 },
    mouthCurve: { val: 0, target: 0, vel: 0, stiffness: 0.1, damping: 0.8 },
    mouthWidth: { val: 80, target: 80, vel: 0, stiffness: 0.1, damping: 0.8 },
    eyeSquint: { val: 0, target: 0, vel: 0, stiffness: 0.15, damping: 0.82 },
    eyeAngle: { val: 0, target: 0, vel: 0, stiffness: 0.08, damping: 0.85 },
    tongueVal: { val: 0, target: 0, vel: 0, stiffness: 0.15, damping: 0.75 },
    winkL: { val: 0, target: 0, vel: 0, stiffness: 0.2, damping: 0.8 },
    winkR: { val: 0, target: 0, vel: 0, stiffness: 0.2, damping: 0.8 },
  });

  const animState = useRef({
    blinkValue: 0,
    blinkSpeed: 0.4,
    lookX: 0,
    lookY: 0,
    eyeLagX: 0,
    eyeLagY: 0,
    tilt: 0,
    breath: 0,
    chromaticOffset: 0,
    eyeTwitchLX: 0,
    eyeTwitchLY: 0,
    eyeTwitchRX: 0,
    eyeTwitchRY: 0,
    glitchIntensity: 0,
    microTwitch: 1,
    floatTime: 0,
    dancePhase: 0,
    discoColorIdx: 0,
    idleCycle: 0,
    nextBlinkTime: 0,
    twitchPhase: 0,
    laughHeave: 0,
    laughPhase: 0,
    audioLevel: 0,
    thinkingPhase: 0,
    thinkingLookDirection: 0
  });

  const targetState = useRef({ 
    blinkValue: 0,
    chromaticOffset: 0,
  });

  useEffect(() => {
    const isSpecial = mode !== Mode.NORMAL;
    const s = springState.current;
    
    const defStiff = 0.12;
    const defDamp = 0.82;
    
    const isEvil = (exp: Expression) => exp === Expression.EVIL || exp === Expression.EVILLAUGH || exp === Expression.EVILLAUGH_TWITCH;
    const transitioningFromEvil = isEvil(lastExpression.current);
    const transitioningToEvil = isEvil(expression);
    const transitioningToPleading = expression === Expression.PLEADING;
    
    const snapMultiplier = (transitioningToEvil || transitioningFromEvil || transitioningToPleading) ? 2.5 : 1.0;

    s.eyeSize.stiffness = defStiff * (transitioningToPleading ? 1.8 : snapMultiplier); 
    s.eyeSize.damping = transitioningToEvil || transitioningToPleading ? 0.72 : defDamp;

    s.mouthWidth.stiffness = 0.1 * snapMultiplier;
    s.mouthCurve.stiffness = 0.1 * snapMultiplier;
    s.eyeAngle.stiffness = 0.08 * (transitioningToPleading ? 2.0 : snapMultiplier);
    s.eyeSquint.stiffness = 0.15 * snapMultiplier;

    if (expression !== lastExpression.current) {
      const isBlink = expression === Expression.BLINK || lastExpression.current === Expression.BLINK;
      if (!isBlink) {
        const isHighEnergy = [Expression.LAUGHING, Expression.EVILLAUGH, Expression.EVILLAUGH_TWITCH, Expression.HAPPY, Expression.EVIL_RANT, Expression.DISCO, Expression.TONGUE_SQUINT].includes(expression);
        const intensity = isHighEnergy ? 3.5 : (isSpecial ? 2.5 : 1.5);
        s.squash.vel -= 0.08 * intensity;
        s.faceYOffset.vel -= 7 * intensity;
      }
      lastExpression.current = expression;
    }

    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const isPortrait = window.innerHeight > window.innerWidth;
    const baseSize = isPortrait ? minDim * 0.125 : minDim * 0.085;
    const baseMouthWidth = baseSize * 2.2;
    animState.current.glitchIntensity = mode === Mode.PHONK ? 0.35 : 0;

    s.tongueVal.target = 0;
    s.winkL.target = 0;
    s.winkR.target = 0;
    s.eyeSquint.target = 0;
    s.eyeAngle.target = 0;

    const portraitYBias = isPortrait ? -minDim * 0.15 : 0;

    switch (expression) {
      case Expression.IDLE:
        s.eyeSize.target = baseSize;
        s.mouthWidth.target = baseMouthWidth;
        s.mouthCurve.target = 0;
        s.faceYOffset.target = portraitYBias;
        s.eyeAngle.target = mode === Mode.PHONK ? 0.2 : 0;
        targetState.current.chromaticOffset = mode === Mode.PHONK ? 10 : (mode === Mode.DISCO ? 4 : 0);
        break;
      case Expression.HAPPY:
      case Expression.DISCO:
        s.eyeSize.target = baseSize * 1.15;
        s.mouthWidth.target = baseMouthWidth * 1.4;
        s.mouthCurve.target = baseSize * 0.9;
        s.faceYOffset.target = (isPortrait ? -30 : -40) + portraitYBias;
        s.eyeSquint.target = mode === Mode.DISCO ? 0.1 : 0.65;
        s.eyeAngle.target = mode === Mode.DISCO ? -0.2 : 0;
        targetState.current.chromaticOffset = mode === Mode.DISCO ? 12 : 1;
        break;
      case Expression.ANGRY:
      case Expression.EVIL:
        const isManiacal = expression === Expression.EVIL;
        s.eyeSize.target = baseSize * (isManiacal ? 1.25 : 1.1);
        s.mouthWidth.target = baseMouthWidth * (isManiacal ? 0.9 : 0.8);
        s.mouthCurve.target = baseSize * (isManiacal ? -0.4 : -0.5);
        s.eyeAngle.target = isManiacal ? 0.75 : 0.5;
        s.eyeSquint.target = 0.55;
        s.faceYOffset.target = portraitYBias;
        break;
      case Expression.PLEADING:
        s.eyeSize.target = baseSize * 1.6;
        s.mouthWidth.target = baseMouthWidth * 0.55;
        s.mouthCurve.target = baseSize * -0.7;
        s.eyeSquint.target = 0.15;
        s.eyeAngle.target = -0.35;
        s.faceYOffset.target = (isPortrait ? 20 : 35) + portraitYBias;
        break;
      case Expression.TONGUE_SQUINT:
        s.eyeSize.target = baseSize * 1.1;
        s.mouthWidth.target = baseMouthWidth * 1.2;
        s.mouthCurve.target = baseSize * 0.8;
        s.eyeSquint.target = 0.95;
        s.tongueVal.target = 1;
        s.faceYOffset.target = portraitYBias;
        break;
      case Expression.YUM:
        s.eyeSize.target = baseSize * 1.1; 
        s.mouthWidth.target = baseMouthWidth * 1.35;
        s.mouthCurve.target = baseSize * 1.05;
        s.eyeSquint.target = 0.65;
        s.tongueVal.target = 0.85;
        s.eyeAngle.target = -0.05;
        s.faceYOffset.target = portraitYBias;
        break;
      case Expression.TONGUE_WINK:
        s.eyeSize.target = baseSize * 1.3; 
        s.mouthWidth.target = baseMouthWidth * 1.45;
        s.mouthCurve.target = baseSize * 1.15;
        s.winkR.target = 1.0; 
        s.tongueVal.target = 1.0;
        s.eyeAngle.target = -0.15;
        s.faceYOffset.target = -15 + portraitYBias;
        break;
      case Expression.WINK:
        s.eyeSize.target = baseSize * 1.15;
        s.mouthWidth.target = baseMouthWidth * 1.1;
        s.mouthCurve.target = baseSize * 0.4;
        s.winkR.target = 0.95;
        s.faceYOffset.target = portraitYBias;
        break;
      case Expression.EVILLAUGH:
      case Expression.EVILLAUGH_TWITCH:
        s.eyeSize.target = baseSize * 1.4;
        s.mouthWidth.target = baseMouthWidth * 2.1;
        s.mouthCurve.target = baseSize * 2.0;
        s.faceYOffset.target = (isPortrait ? -40 : -70) + portraitYBias;
        s.eyeSquint.target = 0.95;
        s.eyeAngle.target = 1.1;
        targetState.current.chromaticOffset = expression === Expression.EVILLAUGH_TWITCH ? 80 : 25;
        animState.current.glitchIntensity = expression === Expression.EVILLAUGH_TWITCH ? 1.0 : 0.4;
        break;
      case Expression.SMUG:
        s.eyeSize.target = baseSize * 0.95;
        s.mouthWidth.target = baseMouthWidth * 1.1;
        s.mouthCurve.target = baseSize * 0.4;
        s.eyeSquint.target = 0.75;
        s.eyeAngle.target = -0.4;
        s.faceYOffset.target = portraitYBias;
        break;
      case Expression.THINKING:
        s.eyeSize.target = baseSize * 0.9;
        s.mouthWidth.target = baseMouthWidth * 0.8;
        s.mouthCurve.target = baseSize * -0.2;
        s.eyeSquint.target = 0.3;
        s.eyeAngle.target = 0;
        s.faceYOffset.target = portraitYBias;
        targetState.current.chromaticOffset = 2;
        break;
      case Expression.BLINK:
        targetState.current.blinkValue = 1;
        animState.current.blinkSpeed = 0.35 + Math.random() * 0.35;
        break;
      default:
        s.eyeSize.target = baseSize;
        s.mouthWidth.target = baseMouthWidth;
        s.mouthCurve.target = 0;
        s.faceYOffset.target = portraitYBias;
    }
  }, [expression, mode]);

  const updateSpring = (spring: { val: number, target: number, vel: number, stiffness: number, damping: number }, dt: number) => {
    const force = (spring.target - spring.val) * spring.stiffness;
    spring.vel = (spring.vel + force) * spring.damping;
    spring.val += spring.vel * dt * 60;
  };

  const smooth = (current: number, target: number, speed: number, dt: number) => {
    const factor = 1 - Math.exp(-speed * dt * 60);
    return current + (target - current) * factor;
  };

  const drawVisualizer = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, mode: Mode) => {
    const freq = audioService.getFrequencyData();
    if (freq.length === 0) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(animState.current.tilt);
    
    const count = freq.length / 2;
    const step = (Math.PI * 2) / count;
    
    ctx.lineWidth = mode === Mode.PHONK ? 3 : 2;
    ctx.lineCap = 'round';
    
    const color = mode === Mode.PHONK ? '#ff0055' : (mode === Mode.DISCO ? DISCO_COLORS[animState.current.discoColorIdx] : 'white');
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.4;

    for (let i = 0; i < count; i++) {
      const angle = i * step;
      const v = freq[i] / 255;
      const h = v * radius * 0.8;
      
      const startR = radius * 1.2;
      const endR = startR + h;
      
      const sx = Math.cos(angle) * startR;
      const sy = Math.sin(angle) * startR;
      const ex = Math.cos(angle) * endR;
      const ey = Math.sin(angle) * endR;
      
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawFace = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, vScale: number, vRotation: number, alpha: number = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.translate(x, y);
    ctx.rotate(animState.current.tilt + vRotation);

    const audioMod = 1 + (animState.current.audioLevel / 255) * 0.1;
    const eyeSp = springState.current.eyeSize.val * 2.6 * audioMod;

    const renderEye = (ex: number, ey: number, angle: number, tx: number, ty: number, winkAmt: number) => {
      ctx.save();
      ctx.translate(ex + tx + animState.current.eyeLagX, ey + ty + animState.current.eyeLagY);
      ctx.rotate(angle);
      const s = springState.current.squash.val * (1 - (animState.current.audioLevel / 255) * 0.05);
      ctx.scale(animState.current.microTwitch * vScale, s * animState.current.microTwitch * vScale);
      
      const r = springState.current.eyeSize.val / 2;
      const totalSquint = Math.max(springState.current.eyeSquint.val, animState.current.blinkValue, winkAmt);
      const squintHeight = r * (1 - totalSquint);
      
      ctx.beginPath();
      ctx.ellipse(0, 0, r, Math.max(1.0, squintHeight), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    renderEye(-eyeSp, -20, -springState.current.eyeAngle.val, animState.current.eyeTwitchLX, animState.current.eyeTwitchLY, springState.current.winkL.val);
    renderEye(eyeSp, -20, springState.current.eyeAngle.val, animState.current.eyeTwitchRX, animState.current.eyeTwitchRY, springState.current.winkR.val);

    const mouthY = 80;
    const halfWidth = springState.current.mouthWidth.val / 2;
    const breathMouthMod = Math.sin(animState.current.breath * 0.6) * 5 + (animState.current.audioLevel / 255) * 10;
    const currentMouthCurve = springState.current.mouthCurve.val + breathMouthMod;
    
    ctx.beginPath();
    ctx.moveTo(-halfWidth * vScale, mouthY);
    ctx.quadraticCurveTo(0, mouthY + currentMouthCurve * 1.8 * springState.current.squash.val * vScale, halfWidth * vScale, mouthY);
    ctx.stroke();

    if (springState.current.tongueVal.val > 0.05) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      const tW = springState.current.mouthWidth.val * 0.45;
      const tH = springState.current.tongueVal.val * 45;
      
      const isPlayful = expression === Expression.YUM || expression === Expression.TONGUE_WINK;
      const tOff = isPlayful ? halfWidth * 0.55 : 0;
      const wag = isPlayful ? Math.sin(animState.current.floatTime * 0.1) * 0.05 : 0;
      const tRot = (isPlayful ? 0.15 : 0) + wag;
      
      ctx.translate(tOff, mouthY + 8);
      ctx.rotate(tRot);
      
      if (ctx.roundRect) {
        ctx.roundRect(-tW / 2, 0, tW, tH, [0, 0, 30, 30]);
      } else {
        ctx.rect(-tW / 2, 0, tW, tH); 
      }
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime.current) / 1000, 0.05);
    lastFrameTime.current = now;

    const { width, height } = ctx.canvas;
    const isPortrait = height > width;
    ctx.clearRect(0, 0, width, height);

    animState.current.audioLevel = audioService.getAverageLevel();

    animState.current.twitchPhase += dt * 60;
    animState.current.idleCycle += dt;
    animState.current.breath += 0.06 * dt * 60;
    animState.current.floatTime += dt * 60;

    animState.current.eyeTwitchLX = 0;
    animState.current.eyeTwitchLY = 0;
    animState.current.eyeTwitchRX = 0;
    animState.current.eyeTwitchRY = 0;
    animState.current.laughHeave = 0;

    let proceduralBobX = 0;
    let proceduralBobY = 0;

    if (expression === Expression.IDLE) {
      if (now > animState.current.nextBlinkTime) {
        targetState.current.blinkValue = 1;
        animState.current.blinkSpeed = Math.random() > 0.7 ? 0.2 : 0.45 + Math.random() * 0.2;
        animState.current.nextBlinkTime = now + 1500 + Math.random() * 10000;
      }
      
      const bobFreq = 1.3;
      const swayFreq = bobFreq * 0.5;
      proceduralBobY = Math.sin(animState.current.idleCycle * bobFreq) * (isPortrait ? 18 : 22);
      proceduralBobX = Math.cos(animState.current.idleCycle * swayFreq) * (isPortrait ? 14 : 18);
      
      const mouthWidthMod = Math.sin(animState.current.idleCycle * 0.7) * 4 + Math.sin(animState.current.idleCycle * 1.5) * 2;
      const mouthCurveMod = Math.cos(animState.current.idleCycle * 1.1) * 2 + Math.sin(animState.current.idleCycle * 0.3) * 3;
      const baseMouthW = isPortrait ? width * 0.125 * 2.2 : width * 0.085 * 2.2;
      
      springState.current.mouthWidth.target = baseMouthW + mouthWidthMod;
      springState.current.mouthCurve.target = mouthCurveMod;
      
      const sway1 = Math.sin(animState.current.idleCycle * 0.3) * 0.04;
      const sway2 = Math.sin(animState.current.idleCycle * 0.65) * 0.02;
      const targetTilt = sway1 + sway2 + (proceduralBobX * 0.001);
      animState.current.tilt = smooth(animState.current.tilt, targetTilt, 0.03, dt);
    } else if (expression === Expression.EVILLAUGH_TWITCH || expression === Expression.EVILLAUGH) {
      animState.current.laughPhase += dt * 35;
      
      if (expression === Expression.EVILLAUGH_TWITCH) {
        const intensity = 7;
        animState.current.eyeTwitchLX = (Math.random() - 0.5) * intensity;
        animState.current.eyeTwitchLY = (Math.random() - 0.5) * intensity;
        animState.current.eyeTwitchRX = (Math.random() - 0.5) * intensity;
        animState.current.eyeTwitchRY = (Math.random() - 0.5) * intensity;
        animState.current.laughHeave = Math.abs(Math.sin(animState.current.laughPhase)) * -15;
        const mouthJitter = (Math.random() - 0.5) * 15;
        springState.current.mouthWidth.target += mouthJitter;
        springState.current.mouthCurve.target += (Math.random() - 0.5) * 10;
        animState.current.tilt = (Math.random() - 0.5) * 0.12 + Math.sin(animState.current.laughPhase * 0.2) * 0.05;
      }
    } else if (expression === Expression.PLEADING) {
      animState.current.eyeTwitchLX = Math.sin(animState.current.floatTime * 0.2) * 1.5;
      animState.current.eyeTwitchLY = Math.cos(animState.current.floatTime * 0.25) * 1.5;
      animState.current.eyeTwitchRX = Math.sin(animState.current.floatTime * 0.22) * 1.5;
      animState.current.eyeTwitchRY = Math.cos(animState.current.floatTime * 0.27) * 1.5;
      animState.current.tilt = Math.sin(animState.current.floatTime * 0.05) * 0.03;
    } else if (expression === Expression.THINKING) {
      animState.current.thinkingPhase += dt * 2;
      
      // Eye movement pattern that looks like thinking
      const lookCycle = Math.sin(animState.current.thinkingPhase * 0.7);
      const upDownLook = Math.sin(animState.current.thinkingPhase * 1.3) * 0.5;
      
      // Eyes look around thoughtfully
      animState.current.eyeTwitchLX = lookCycle * 3 + upDownLook;
      animState.current.eyeTwitchLY = upDownLook * 2;
      animState.current.eyeTwitchRX = lookCycle * 3 + upDownLook;
      animState.current.eyeTwitchRY = upDownLook * 2;
      
      // Subtle head tilt like in deep thought
      animState.current.tilt = Math.sin(animState.current.thinkingPhase * 0.3) * 0.02;
      
      // Occasional brow furrow micro-movement
      if (Math.random() > 0.95) {
        springState.current.eyeSquint.target = 0.4 + Math.random() * 0.2;
        setTimeout(() => {
          if (expression === Expression.THINKING) {
            springState.current.eyeSquint.target = 0.3;
          }
        }, 200 + Math.random() * 300);
      }
    } else {
      animState.current.tilt = smooth(animState.current.tilt, 0, 0.15, dt);
    }

    (Object.values(springState.current) as Array<{ val: number, target: number, vel: number, stiffness: number, damping: number }>).forEach(spring => updateSpring(spring, dt));

    animState.current.blinkValue = smooth(animState.current.blinkValue, targetState.current.blinkValue, animState.current.blinkSpeed, dt);
    animState.current.chromaticOffset = smooth(animState.current.chromaticOffset, targetState.current.chromaticOffset, 0.1, dt);
    if (animState.current.blinkValue > 0.95) targetState.current.blinkValue = 0;

    const bpm = mode === Mode.DISCO ? 128 : (mode === Mode.PHONK ? 135 : 60);
    const beatSec = 60 / bpm;
    animState.current.dancePhase += (dt / beatSec) * Math.PI * 2;
    
    const isDancing = mode !== Mode.NORMAL;
    const vBounce = isDancing ? (Math.abs(Math.sin(animState.current.dancePhase)) * (isPortrait ? 25 : 45)) : proceduralBobY;
    const hSway = mode === Mode.DISCO ? (Math.sin(animState.current.dancePhase / 2) * (isPortrait ? 40 : 85)) : (isDancing ? 0 : proceduralBobX);
    
    const vScale = isDancing ? (1 + Math.pow(Math.abs(Math.sin(animState.current.dancePhase)), 10) * 0.25) : 1;
    const vRotation = mode === Mode.PHONK ? (Math.sin(animState.current.dancePhase / 4) * 0.06) : (mode === Mode.DISCO ? Math.sin(animState.current.dancePhase / 2) * 0.12 : 0);

    const lookLimitX = isPortrait ? width * 0.15 : width * 0.3;
    const lookLimitY = isPortrait ? height * 0.1 : height * 0.2;

    const tLookX = ((mousePos.current.x - width / 2) / (width / 2)) * lookLimitX;
    const tLookY = ((mousePos.current.y - height / 2) / (height / 2)) * lookLimitY;
    
    animState.current.lookX = smooth(animState.current.lookX, tLookX + hSway, 0.12, dt);
    animState.current.lookY = smooth(animState.current.lookY, tLookY - vBounce + animState.current.laughHeave, 0.12, dt);
    animState.current.eyeLagX = smooth(animState.current.eyeLagX, animState.current.lookX * 0.25, 0.1, dt);
    animState.current.eyeLagY = smooth(animState.current.eyeLagY, animState.current.lookY * 0.25, 0.1, dt);

    const cX = width / 2 + animState.current.lookX;
    const cY = (height / 2) + springState.current.faceYOffset.val + animState.current.lookY;

    // Background Reactive Gradients
    if (mode === Mode.DISCO) {
      const idx = Math.floor(animState.current.dancePhase / Math.PI) % DISCO_COLORS.length;
      animState.current.discoColorIdx = idx;
      const grad = ctx.createRadialGradient(cX, cY, 0, cX, cY, width * (isPortrait ? 1.0 : 0.7));
      grad.addColorStop(0, DISCO_COLORS[idx] + '22');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    } else if (mode === Mode.PHONK || expression === Expression.EVILLAUGH_TWITCH) {
      const grad = ctx.createRadialGradient(cX, cY, 0, cX, cY, width * (isPortrait ? 0.8 : 0.5));
      const color = (expression === Expression.EVILLAUGH_TWITCH || expression === Expression.EVILLAUGH) ? 'rgba(255, 0, 100, 0.25)' : (mode === Mode.PHONK ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    }

    // DRAW VISUALIZER (Listening to you)
    const visRadius = springState.current.eyeSize.val * (isPortrait ? 4.5 : 5);
    drawVisualizer(ctx, cX, cY, visRadius, mode);

    const off = animState.current.chromaticOffset;
    ctx.save();
    ctx.shadowBlur = isPortrait ? 25 : 25 + (mode !== Mode.NORMAL ? 25 : 0) + (expression === Expression.EVILLAUGH_TWITCH ? 30 : 0);
    ctx.shadowColor = (expression === Expression.EVILLAUGH_TWITCH || expression === Expression.EVILLAUGH) ? '#ff0055' : (mode === Mode.PHONK ? 'red' : (mode === Mode.DISCO ? DISCO_COLORS[animState.current.discoColorIdx] : 'white'));

    if (off > 0.15) {
      ctx.globalCompositeOperation = 'screen';
      drawFace(ctx, '#ff3366', cX - off, cY, vScale, vRotation);
      drawFace(ctx, '#00ffee', cX, cY, vScale, vRotation);
      drawFace(ctx, '#5599ff', cX + off, cY, vScale, vRotation);
    } else {
      drawFace(ctx, 'white', cX, cY, vScale, vRotation);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = mode === Mode.PHONK || expression === Expression.EVILLAUGH_TWITCH ? 0.18 : 0.08;
    ctx.fillStyle = mode === Mode.PHONK || expression === Expression.EVILLAUGH_TWITCH ? '#ff0055' : 'white';
    for (let i = 0; i < height; i += isPortrait ? 6 : 8) ctx.fillRect(0, i, width, 1.5);
    ctx.restore();

  }, [expression, mode]);

  const animate = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  useEffect(() => {
    const handleResize = () => { 
      if (canvasRef.current) { 
        canvasRef.current.width = window.innerWidth; 
        canvasRef.current.height = window.innerHeight; 
      } 
    };
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full cursor-none touch-none" />;
};

export default MochiCanvas;
