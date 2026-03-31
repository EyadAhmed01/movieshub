import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const body = await request.json();
  const existing = await prisma.seriesEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let userRating = null;
  if (body.userRating === 0 || body.userRating === null) {
    userRating = null;
  } else if (body.userRating !== undefined) {
    const n = Math.round(Number(body.userRating));
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }
    userRating = n;
  } else {
    return NextResponse.json({ error: "userRating required" }, { status: 400 });
  }

  const updated = await prisma.seriesEntry.update({
    where: { id },
    data: { userRating },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const existing = await prisma.seriesEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.seriesEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
