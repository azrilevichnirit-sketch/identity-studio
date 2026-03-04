// Temporary page to preview all active backgrounds
import galleryCrackedWalls from '@/assets/backgrounds/gallery_main_stylized_v5.webp';
import galleryBoxes from '@/assets/backgrounds/gallery_main_boxes_v1.webp';
import galleryMainStylized from '@/assets/backgrounds/gallery_main_stylized.webp';
import galleryMainStylizedWhite from '@/assets/backgrounds/gallery_main_stylized_white_v1.webp';
import galleryMainStylizedV4 from '@/assets/backgrounds/gallery_main_stylized_v4.webp';
import studioWorkshop from '@/assets/backgrounds/studio_in_workshop_v3.webp';
import studioExterior from '@/assets/backgrounds/studio_exterior_park_stylized_v3.webp';
import studioEntranceView from '@/assets/backgrounds/studio_entrance_view_stylized_v8.webp';
import studioStorage from '@/assets/backgrounds/studio_in_storage_v3.webp';
import studioDoorway from '@/assets/backgrounds/studio_doorway_park_view_v5.webp';
import galleryDesktop from '@/assets/backgrounds/gallery_main_desktop.webp';
import galleryMobileWide from '@/assets/backgrounds/gallery_main_mobile_wide.webp';

const backgrounds = [
  { name: 'gallery_main_stylized_v5 (cracked walls)', src: galleryCrackedWalls },
  { name: 'gallery_main_boxes_v1', src: galleryBoxes },
  { name: 'gallery_main_stylized (finished)', src: galleryMainStylized },
  { name: 'gallery_main_stylized_white_v1', src: galleryMainStylizedWhite },
  { name: 'gallery_main_stylized_v4', src: galleryMainStylizedV4 },
  { name: 'studio_in_workshop_v3', src: studioWorkshop },
  { name: 'studio_exterior_park_stylized_v3', src: studioExterior },
  { name: 'studio_entrance_view_stylized_v8', src: studioEntranceView },
  { name: 'studio_in_storage_v3', src: studioStorage },
  { name: 'studio_doorway_park_view_v5', src: studioDoorway },
  { name: 'gallery_main_desktop', src: galleryDesktop },
  { name: 'gallery_main_mobile_wide', src: galleryMobileWide },
];

export default function BackgroundPreview() {
  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-white text-2xl mb-6 text-center">רקעים פעילים</h1>
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
