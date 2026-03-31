import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "")
      .toLowerCase()
      .trim();
    const password = String(body.password || "");
    const name = body.name ? String(body.name).trim() : null;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
