import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/stats — dashboard administrativo
export async function GET() {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const [
    users, agencies, pendingAgencies, owners, properties, activeProperties,
    leads, favorites, reports, openReports, subscriptions,
    payments,
  ] = await Promise.all([
    db.user.count(),
    db.agency.count(),
    db.agency.count({ where: { status: "PENDING" } }),
    db.owner.count(),
    db.property.count(),
    db.property.count({ where: { status: "ACTIVE" } }),
    db.lead.count(),
    db.favorite.count(),
    db.report.count(),
    db.report.count({ where: { status: "OPEN" } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.payment.findMany({ where: { status: "PAID" }, select: { amount: true } }),
  ]);

  const revenue = payments.reduce((s, p) => s + p.amount, 0);

  const topProperties = await db.property.findMany({
    orderBy: { views: "desc" },
    take: 5,
    select: { id: true, title: true, views: true, status: true, price: true, purpose: true },
  });

  const leadsBySourceRaw = await db.lead.groupBy({ by: ["source"], _count: true });
  const leadsBySource = Object.fromEntries(leadsBySourceRaw.map((r) => [r.source, r._count]));

  return NextResponse.json({
    counts: {
      users, agencies, pendingAgencies, owners, properties, activeProperties,
      leads, favorites, reports, openReports, subscriptions, revenue,
    },
    topProperties,
    leadsBySource,
  });
}
