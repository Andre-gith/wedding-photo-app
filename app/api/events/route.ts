import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = (body?.title || "").trim();

  if (!title) {
    return NextResponse.json({ error: "Informe o nome do evento." }, { status: 400 });
  }

  const slug = `${title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)}-${nanoid(6)}`;

  const event = await prisma.event.create({
    data: { title, slug, hostEmail: body?.hostEmail || null },
  });

  return NextResponse.json({ event }, { status: 201 });
}
