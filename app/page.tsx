'use client';

import { Scene } from '@/components/canvas/Scene';
import { Interface } from '@/components/ui/Interface';
import { useConversationStore } from '@/lib/store/conversation-store';

export default function Home() {
  const audioVolume = useConversationStore((state) => state.audioVolume);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <Scene volume={audioVolume} />
      </div>

      {/* UI Overlay */}
      <Interface />
    </div>
  );
}
