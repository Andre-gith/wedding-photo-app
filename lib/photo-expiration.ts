import { prisma } from "@/lib/prisma";
import { deletePhotoFromStorage } from "@/lib/storage";

export const PHOTO_TTL_DAYS = 5;
export const PHOTO_TTL_MS = PHOTO_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function cleanupExpiredPhotos() {
  const expiredPhotos = await prisma.photo.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  for (const photo of expiredPhotos) {
    try {
      await prisma.photo.delete({ where: { id: photo.id } });
      await deletePhotoFromStorage(photo.imageUrl, photo.thumbnailUrl).catch((error) => {
        console.warn("Falha ao remover uma foto expirada do storage:", error);
      });
    } catch (error) {
      console.error("Erro ao limpar foto expirada:", error);
    }
  }

  return expiredPhotos.length;
}

export function getPhotoExpiryDate() {
  return new Date(Date.now() + PHOTO_TTL_MS);
}
