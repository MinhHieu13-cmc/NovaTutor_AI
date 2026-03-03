import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface NovaAvatarViewProps {
  modelPath?: string;
  blendshapes: { [key: string]: number };
  currentEmotion: string;
  isSpeaking?: boolean;
  rotationY?: number;
}

export const NovaAvatarView: React.FC<NovaAvatarViewProps> = ({
  modelPath = '/models/avaturn_model.glb',
  blendshapes,
  currentEmotion,
  isSpeaking = false,
  rotationY = 0,
}) => {
  const group = useRef<THREE.Group>(null);
  const { nodes, scene, animations: avatarAnimations } = useGLTF(modelPath) as any;
  
  const { animations: angryAnims } = useGLTF('/models/Angry.glb') as any;
  const { animations: sadAnims } = useGLTF('/models/Sad.glb') as any;
  const { animations: talking1Anims } = useGLTF('/models/Talking_1.glb') as any;
  const { animations: talking2Anims } = useGLTF('/models/Talking_2.glb') as any;

  const allAnimations = useMemo(() => {
    const clips = [...avatarAnimations];
    if (angryAnims?.[0]) { const c = angryAnims[0].clone(); c.name = 'Angry'; clips.push(c); }
    if (sadAnims?.[0]) { const c = sadAnims[0].clone(); c.name = 'Sad'; clips.push(c); }
    if (talking1Anims?.[0]) { const c = talking1Anims[0].clone(); c.name = 'Talking_1'; clips.push(c); }
    if (talking2Anims?.[0]) { const c = talking2Anims[0].clone(); c.name = 'Talking_2'; clips.push(c); }
    return clips;
  }, [avatarAnimations, angryAnims, sadAnims, talking1Anims, talking2Anims]);

  const { actions } = useAnimations(allAnimations, group);

  const morphMeshes = useMemo(() => {
    const m: any[] = [];
    if (scene) {
      scene.traverse((obj: any) => {
        const dict = obj.morphTargetDictionary || (obj.geometry && obj.geometry.morphTargetDictionary);
        const influences = obj.morphTargetInfluences || (obj.geometry && obj.geometry.morphTargetInfluences);
        if ((obj.isMesh || obj.isSkinnedMesh) && dict && influences) m.push(obj);
      });
    }
    return m;
  }, [scene]);

  const blinkTimer = useRef(0);
  const isBlinking = useRef(false);

  useFrame((state) => {
    if (morphMeshes.length === 0) return;
    const t = state.clock.getElapsedTime();
    const hasV = Object.values(blendshapes).some(v => v > 0);
    const jawNames = ['jawOpen', 'JawOpen', 'mouthOpen', 'MouthOpen', 'vowel_a', 'Mouth_Open', 'Teeth_Open'];

    blinkTimer.current -= 0.01;
    if (blinkTimer.current <= 0) {
      isBlinking.current = true;
      if (blinkTimer.current <= -0.1) {
        blinkTimer.current = Math.random() * 5 + 2;
        isBlinking.current = false;
      }
    }

    morphMeshes.forEach((mesh) => {
      const d = mesh.morphTargetDictionary || (mesh.geometry && mesh.geometry.morphTargetDictionary);
      const i = mesh.morphTargetInfluences || (mesh.geometry && mesh.geometry.morphTargetInfluences);
      if (!d || !i) return;

      if (hasV) {
        Object.entries(blendshapes).forEach(([n, v]) => {
          const p = [n, n.charAt(0).toUpperCase() + n.slice(1), n.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()];
          let idx = undefined; for (const pn of p) { if (d[pn] !== undefined) { idx = d[pn]; break; } }
          if (idx !== undefined) i[idx] = THREE.MathUtils.lerp(i[idx], v, 0.5);
        });
      } else if (isSpeaking) {
        let j = undefined; for (const n of jawNames) { if (d[n] !== undefined) { j = d[n]; break; } }
        if (j !== undefined) i[j] = THREE.MathUtils.lerp(i[j], Math.sin(t * 15) * 0.4 + 0.4, 0.4);
      } else {
        jawNames.forEach(n => { if (d[n] !== undefined) i[d[n]] = THREE.MathUtils.lerp(i[d[n]], 0, 0.2); });
      }

      const eN = ['eyeBlinkLeft', 'EyeBlinkLeft', 'eyeBlinkRight', 'EyeBlinkRight'];
      eN.forEach(n => { if (d[n] !== undefined) i[d[n]] = THREE.MathUtils.lerp(i[d[n]], isBlinking.current ? 1 : 0, 0.5); });
    });
  });

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime();
      const isActive = isSpeaking || currentEmotion !== 'neutral';
      const int = isActive ? 0.1 : 1.0;
      
      // Logic: Khi đang chạy animation (nói/cảm xúc), ưu tiên rotation 0 từ file anim. 
      // Khi nghỉ (Idle), ưu tiên rotationY người dùng cài đặt.
      const targetBaseRotation = isActive ? 0 : rotationY;
      
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y, 
        targetBaseRotation + Math.sin(t * 0.5) * 0.02 * int, 
        0.05 // Tốc độ chuyển đổi góc xoay (0.05 để mượt mà)
      );
    }
  });

  useEffect(() => {
    if (!actions) return;
    const a = actions['Angry'] || actions['angry'];
    const s = actions['Sad'] || actions['sad'];
    const t1 = actions['Talking_1'] || actions['talking_1'];
    const t2 = actions['Talking_2'] || actions['talking_2'];
    const id = actions['Idle'] || actions['idle'] || Object.values(actions)[0];

    let target = id;
    if (isSpeaking && currentEmotion === 'excited') target = t2 || id;
    else if (isSpeaking) target = t1 || id;
    else if (currentEmotion === 'angry') target = a || id;
    else if (currentEmotion === 'sad') target = s || id;

    if (target) {
      Object.values(actions).forEach(act => { if (act !== target) act?.fadeOut(0.5); });
      target.reset().fadeIn(0.5).play();
    }
  }, [actions, isSpeaking, currentEmotion]);

  return <group ref={group} dispose={null}><primitive object={nodes.Scene} /></group>;
};

useGLTF.preload('/models/avaturn_model.glb');
useGLTF.preload('/models/Angry.glb');
useGLTF.preload('/models/Sad.glb');
useGLTF.preload('/models/Talking_1.glb');
useGLTF.preload('/models/Talking_2.glb');
