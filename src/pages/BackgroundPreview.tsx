// Temporary page to preview all backgrounds
import galleryMainStylized from '@/assets/backgrounds/gallery_main_stylized.webp';
import galleryMainStylizedV2 from '@/assets/backgrounds/gallery_main_stylized_v2.webp';
import galleryMainStylizedV3 from '@/assets/backgrounds/gallery_main_stylized_v3.webp';
import galleryMainStylizedWhite from '@/assets/backgrounds/gallery_main_stylized_white_v1.webp';

import studioEntranceViewStylized from '@/assets/backgrounds/studio_entrance_view_stylized.webp';
import studioEntranceViewStylizedV2 from '@/assets/backgrounds/studio_entrance_view_stylized_v2.webp';
import studioEntranceViewStylizedV3 from '@/assets/backgrounds/studio_entrance_view_stylized_v3.webp';
import studioEntranceViewStylizedV4 from '@/assets/backgrounds/studio_entrance_view_stylized_v4.webp';
import studioEntranceViewStylizedV5 from '@/assets/backgrounds/studio_entrance_view_stylized_v5.webp';
import studioEntranceViewStylizedV6 from '@/assets/backgrounds/studio_entrance_view_stylized_v6.webp';
import studioEntranceViewStylizedV7 from '@/assets/backgrounds/studio_entrance_view_stylized_v7.webp';

import studioDoorwayParkView from '@/assets/backgrounds/studio_doorway_park_view.webp';
import studioDoorwayParkViewV2 from '@/assets/backgrounds/studio_doorway_park_view_v2.webp';
import studioDoorwayParkViewV3 from '@/assets/backgrounds/studio_doorway_park_view_v3.webp';
import studioDoorwayParkViewV4 from '@/assets/backgrounds/studio_doorway_park_view_v4.webp';
import studioDoorwayParkViewV5 from '@/assets/backgrounds/studio_doorway_park_view_v5.webp';
import studioDoorwayParkViewV6 from '@/assets/backgrounds/studio_doorway_park_view_v6.webp';
import studioDoorwayParkViewV7 from '@/assets/backgrounds/studio_doorway_park_view_v7.webp';

import studioExteriorParkStylized from '@/assets/backgrounds/studio_exterior_park_stylized.webp';
import studioExteriorParkStylizedV2 from '@/assets/backgrounds/studio_exterior_park_stylized_v2.webp';
import studioExteriorParkStylizedV3 from '@/assets/backgrounds/studio_exterior_park_stylized_v3.webp';
import studioExteriorParkStylizedV4 from '@/assets/backgrounds/studio_exterior_park_stylized_v4.webp';

import studioInEntranceViewBg from '@/assets/backgrounds/studio_in_entrance_view_bg.webp';
import studioInGalleryBg from '@/assets/backgrounds/studio_in_gallery_bg.webp';
import studioInGalleryWallBg from '@/assets/backgrounds/studio_in_gallery_wall_bg.webp';
import studioInStorageBg from '@/assets/backgrounds/studio_in_storage_bg.webp';
import studioInWorkshopBg from '@/assets/backgrounds/studio_in_workshop_bg.webp';
import studioInWorkshopV2 from '@/assets/backgrounds/studio_in_workshop_v2.webp';
import studioInWorkshopV3 from '@/assets/backgrounds/studio_in_workshop_v3.webp';

const backgrounds = [
  { name: 'gallery_main_stylized', src: galleryMainStylized },
  { name: 'gallery_main_stylized_v2', src: galleryMainStylizedV2 },
  { name: 'gallery_main_stylized_v3', src: galleryMainStylizedV3 },
  { name: 'gallery_main_stylized_white_v1', src: galleryMainStylizedWhite },
  
  { name: 'studio_entrance_view_stylized', src: studioEntranceViewStylized },
  { name: 'studio_entrance_view_stylized_v2', src: studioEntranceViewStylizedV2 },
  { name: 'studio_entrance_view_stylized_v3', src: studioEntranceViewStylizedV3 },
  { name: 'studio_entrance_view_stylized_v4', src: studioEntranceViewStylizedV4 },
  { name: 'studio_entrance_view_stylized_v5', src: studioEntranceViewStylizedV5 },
  { name: 'studio_entrance_view_stylized_v6', src: studioEntranceViewStylizedV6 },
  { name: 'studio_entrance_view_stylized_v7', src: studioEntranceViewStylizedV7 },
  
  { name: 'studio_doorway_park_view', src: studioDoorwayParkView },
  { name: 'studio_doorway_park_view_v2', src: studioDoorwayParkViewV2 },
  { name: 'studio_doorway_park_view_v3', src: studioDoorwayParkViewV3 },
  { name: 'studio_doorway_park_view_v4', src: studioDoorwayParkViewV4 },
  { name: 'studio_doorway_park_view_v5', src: studioDoorwayParkViewV5 },
  { name: 'studio_doorway_park_view_v6', src: studioDoorwayParkViewV6 },
  { name: 'studio_doorway_park_view_v7', src: studioDoorwayParkViewV7 },
  
  { name: 'studio_exterior_park_stylized', src: studioExteriorParkStylized },
  { name: 'studio_exterior_park_stylized_v2', src: studioExteriorParkStylizedV2 },
  { name: 'studio_exterior_park_stylized_v3', src: studioExteriorParkStylizedV3 },
  { name: 'studio_exterior_park_stylized_v4', src: studioExteriorParkStylizedV4 },
  
  { name: 'studio_in_entrance_view_bg', src: studioInEntranceViewBg },
  { name: 'studio_in_gallery_bg', src: studioInGalleryBg },
  { name: 'studio_in_gallery_wall_bg', src: studioInGalleryWallBg },
  { name: 'studio_in_storage_bg', src: studioInStorageBg },
  { name: 'studio_in_workshop_bg', src: studioInWorkshopBg },
  { name: 'studio_in_workshop_v2', src: studioInWorkshopV2 },
  { name: 'studio_in_workshop_v3', src: studioInWorkshopV3 },
];

export default function BackgroundPreview() {
  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-white text-2xl mb-6 text-center">כל הרקעים</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {backgrounds.map((bg) => (
          <div key={bg.name} className="bg-gray-900 rounded-lg overflow-hidden">
            <img 
              src={bg.src} 
              alt={bg.name}
              className="w-full h-48 object-cover"
            />
            <p className="text-white text-sm p-2 text-center font-mono">{bg.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
