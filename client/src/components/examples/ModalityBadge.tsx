import ModalityBadge from "../ModalityBadge";

export default function ModalityBadgeExample() {
  return (
    <div className="flex gap-2">
      <ModalityBadge modality="presentiel" />
      <ModalityBadge modality="distanciel" />
      <ModalityBadge modality="hybride" />
    </div>
  );
}
