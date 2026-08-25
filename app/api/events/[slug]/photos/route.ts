import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredPhotos, getPhotoExpiryDate } from "@/lib/photo-expiration";
import { deletePhotoFromStorage, processAndUploadPhoto } from "@/lib/storage";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB, celular costuma mandar fotos grandes

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) {
    return NextResponse.json({ error: "Evento n\u00e3o encontrado." }, { status: 404 });
  }

  await cleanupExpiredPhotos();

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const mode = _req.nextUrl.searchParams.get("mode");
  const visiblePhotos =
    mode === "moderation" ? photos : photos.filter((photo) => photo.status !== "REJECTED");

  return NextResponse.json({ event, photos: visiblePhotos });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const photoId = req.nextUrl.searchParams.get("photoId") || req.nextUrl.searchParams.get("id");
  if (!photoId) {
    return NextResponse.json({ error: "Foto não informada." }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      event: { slug: params.slug },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  try {
    await prisma.photo.delete({ where: { id: photo.id } });
    await deletePhotoFromStorage(photo.imageUrl, photo.thumbnailUrl).catch((error) => {
      console.warn("Falha ao remover a foto no storage:", error);
    });
    return NextResponse.json({ ok: true, photoId: photo.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível excluir a foto." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.isPublished) {
    return NextResponse.json({ error: "Evento n\u00e3o encontrado." }, { status: 404 });
  }

  await cleanupExpiredPhotos();

  const currentCount = await prisma.photo.count({ where: { eventId: event.id } });
  if (currentCount >= event.photoLimit) {
    return NextResponse.json(
      { error: "Esse evento atingiu o limite de fotos." },
      { status: 409 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("photo") as File | null;
  const guestName = ((formData?.get("guestName") as string) || "Convidado").slice(0, 60);

  if (!file) {
    return NextResponse.json({ error: "Nenhuma foto enviada." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Arquivo precisa ser uma imagem." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { imageUrl, thumbnailUrl, width, height } = await processAndUploadPhoto(
      buffer,
      event.slug
    );

    const photo = await prisma.photo.create({
      data: {
        eventId: event.id,
        guestName: guestName.trim() || "Convidado",
        imageUrl,
        thumbnailUrl,
        width,
        height,
        status: "APPROVED",
        expiresAt: getPhotoExpiryDate(),
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "N\u00e3o foi poss\u00edvel processar a imagem. Tente outra foto." },
      { status: 500 }
    );
  }
}
