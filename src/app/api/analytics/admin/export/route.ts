import { NextResponse, type NextRequest } from "next/server";
import { isReservedAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface CsvColumn<Row extends Record<string, unknown>> {
  key: keyof Row;
  label: string;
}

interface StaffInviteExportRow {
  id: string;
  team_id: string;
  email: string;
  club_role: string;
  invited_by: string | null;
  invited_profile_id: string | null;
  status: string;
  accepted_at: string | null;
  declined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  teams: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
}

interface JoinRequestExportRow {
  id: string;
  team_id: string;
  profile_id: string;
  requested_role: string;
  note: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
  teams: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
  profiles: {
    display_name: string | null;
    role: string | null;
    location: string | null;
  } | null;
}

interface MeetingExportRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  requested_by: string | null;
  responded_by: string | null;
  status: string;
  request_reason: string | null;
  scheduled_at: string | null;
  scheduled_duration_minutes: number | null;
  room_opened_at: string | null;
  daily_room_name: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  teams: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
  profiles: {
    display_name: string | null;
    location: string | null;
  } | null;
}

type FlatRow = Record<string, string | number | null>;

const datasetLabels: Record<string, string> = {
  summary: "admin-summary",
  "staff-invites": "staff-invites",
  "join-requests": "club-join-requests",
  calls: "video-calls"
};

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv<Row extends Record<string, unknown>>(columns: CsvColumn<Row>[], rows: Row[]) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(",")).join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function csvResponse(dataset: string, csv: string) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `euroscout-${datasetLabels[dataset] ?? dataset}-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

async function requireAdminServiceClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();

  if (profile?.role !== "admin" || !isReservedAdminEmail(user.email)) {
    return { response: NextResponse.json({ error: "Admin access is required." }, { status: 403 }) };
  }

  return { serviceClient };
}

async function exportSummary(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>) {
  const [
    { count: users },
    { count: newUsers },
    { count: players },
    { count: clubs },
    { count: staffInvitesSent },
    { count: staffInvitesAccepted },
    { count: staffInvitesDeclined },
    { count: joinRequestsAccepted },
    { count: joinRequestsDeclined },
    { count: callsScheduled },
    { count: callsMade },
    { count: callJoinAttempts }
  ] = await Promise.all([
    serviceClient.from("profiles").select("id", { count: "exact", head: true }),
    serviceClient.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
    serviceClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    serviceClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "club"),
    serviceClient.from("club_staff_invites").select("id", { count: "exact", head: true }),
    serviceClient.from("club_staff_invites").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    serviceClient.from("club_staff_invites").select("id", { count: "exact", head: true }).eq("status", "declined"),
    serviceClient.from("club_join_requests").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    serviceClient.from("club_join_requests").select("id", { count: "exact", head: true }).eq("status", "declined"),
    serviceClient.from("meeting_requests").select("id", { count: "exact", head: true }).in("status", ["accepted", "completed"]).not("scheduled_at", "is", null),
    serviceClient.from("meeting_requests").select("id", { count: "exact", head: true }).not("room_opened_at", "is", null),
    serviceClient.from("meeting_join_tokens").select("id", { count: "exact", head: true })
  ]);

  const rows: FlatRow[] = [
    { metric: "users", value: users ?? 0 },
    { metric: "new_users_30d", value: newUsers ?? 0 },
    { metric: "players", value: players ?? 0 },
    { metric: "clubs", value: clubs ?? 0 },
    { metric: "staff_invites_sent", value: staffInvitesSent ?? 0 },
    { metric: "staff_invites_accepted", value: staffInvitesAccepted ?? 0 },
    { metric: "staff_invites_declined", value: staffInvitesDeclined ?? 0 },
    { metric: "join_requests_accepted", value: joinRequestsAccepted ?? 0 },
    { metric: "join_requests_declined", value: joinRequestsDeclined ?? 0 },
    { metric: "calls_scheduled", value: callsScheduled ?? 0 },
    { metric: "calls_made", value: callsMade ?? 0 },
    { metric: "call_join_attempts", value: callJoinAttempts ?? 0 }
  ];

  return toCsv(
    [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" }
    ],
    rows
  );
}

async function exportStaffInvites(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>) {
  const { data } = await serviceClient
    .from("club_staff_invites")
    .select(
      `
        id,
        team_id,
        email,
        club_role,
        invited_by,
        invited_profile_id,
        status,
        accepted_at,
        declined_at,
        expires_at,
        created_at,
        updated_at,
        teams!team_id (
          name,
          city,
          country
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<StaffInviteExportRow[]>();

  const rows: FlatRow[] = (data ?? []).map((invite) => ({
    id: invite.id,
    team_id: invite.team_id,
    team_name: invite.teams?.name ?? "",
    team_city: invite.teams?.city ?? "",
    team_country: invite.teams?.country ?? "",
    email: invite.email,
    club_role: invite.club_role,
    status: invite.status,
    invited_by: invite.invited_by,
    invited_profile_id: invite.invited_profile_id,
    accepted_at: invite.accepted_at,
    declined_at: invite.declined_at,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
    updated_at: invite.updated_at
  }));

  return toCsv(
    [
      { key: "id", label: "Invite ID" },
      { key: "team_id", label: "Team ID" },
      { key: "team_name", label: "Team" },
      { key: "team_city", label: "City" },
      { key: "team_country", label: "Country" },
      { key: "email", label: "Email" },
      { key: "club_role", label: "Club Role" },
      { key: "status", label: "Status" },
      { key: "invited_by", label: "Invited By" },
      { key: "invited_profile_id", label: "Accepted Profile ID" },
      { key: "accepted_at", label: "Accepted At" },
      { key: "declined_at", label: "Declined At" },
      { key: "expires_at", label: "Expires At" },
      { key: "created_at", label: "Created At" },
      { key: "updated_at", label: "Updated At" }
    ],
    rows
  );
}

async function exportJoinRequests(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>) {
  const { data } = await serviceClient
    .from("club_join_requests")
    .select(
      `
        id,
        team_id,
        profile_id,
        requested_role,
        note,
        status,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        teams!team_id (
          name,
          city,
          country
        ),
        profiles!profile_id (
          display_name,
          role,
          location
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<JoinRequestExportRow[]>();

  const rows: FlatRow[] = (data ?? []).map((request) => ({
    id: request.id,
    team_id: request.team_id,
    team_name: request.teams?.name ?? "",
    team_city: request.teams?.city ?? "",
    team_country: request.teams?.country ?? "",
    profile_id: request.profile_id,
    profile_name: request.profiles?.display_name ?? "",
    profile_role: request.profiles?.role ?? "",
    profile_location: request.profiles?.location ?? "",
    requested_role: request.requested_role,
    status: request.status,
    note: request.note,
    reviewed_by: request.reviewed_by,
    reviewed_at: request.reviewed_at,
    created_at: request.created_at,
    updated_at: request.updated_at
  }));

  return toCsv(
    [
      { key: "id", label: "Request ID" },
      { key: "team_id", label: "Team ID" },
      { key: "team_name", label: "Team" },
      { key: "team_city", label: "City" },
      { key: "team_country", label: "Country" },
      { key: "profile_id", label: "Profile ID" },
      { key: "profile_name", label: "Profile" },
      { key: "profile_role", label: "Account Role" },
      { key: "profile_location", label: "Location" },
      { key: "requested_role", label: "Requested Club Role" },
      { key: "status", label: "Status" },
      { key: "note", label: "Note" },
      { key: "reviewed_by", label: "Reviewed By" },
      { key: "reviewed_at", label: "Reviewed At" },
      { key: "created_at", label: "Created At" },
      { key: "updated_at", label: "Updated At" }
    ],
    rows
  );
}

async function exportCalls(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>) {
  const { data } = await serviceClient
    .from("meeting_requests")
    .select(
      `
        id,
        team_id,
        player_profile_id,
        requested_by,
        responded_by,
        status,
        request_reason,
        scheduled_at,
        scheduled_duration_minutes,
        room_opened_at,
        daily_room_name,
        accepted_at,
        declined_at,
        cancelled_at,
        completed_at,
        created_at,
        updated_at,
        teams!meeting_requests_team_id_fkey (
          name,
          city,
          country
        ),
        profiles!meeting_requests_player_profile_id_fkey (
          display_name,
          location
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<MeetingExportRow[]>();

  const meetingIds = (data ?? []).map((meeting) => meeting.id);
  const { data: joinRows } = meetingIds.length
    ? await serviceClient.from("meeting_join_tokens").select("meeting_request_id").in("meeting_request_id", meetingIds).returns<Array<{ meeting_request_id: string }>>()
    : { data: [] as Array<{ meeting_request_id: string }> };
  const joinCounts = new Map<string, number>();
  (joinRows ?? []).forEach((row) => joinCounts.set(row.meeting_request_id, (joinCounts.get(row.meeting_request_id) ?? 0) + 1));

  const rows: FlatRow[] = (data ?? []).map((meeting) => ({
    id: meeting.id,
    team_id: meeting.team_id,
    team_name: meeting.teams?.name ?? "",
    team_city: meeting.teams?.city ?? "",
    team_country: meeting.teams?.country ?? "",
    player_profile_id: meeting.player_profile_id,
    player_name: meeting.profiles?.display_name ?? "",
    player_location: meeting.profiles?.location ?? "",
    requested_by: meeting.requested_by,
    responded_by: meeting.responded_by,
    status: meeting.status,
    request_reason: meeting.request_reason,
    scheduled_at: meeting.scheduled_at,
    duration_minutes: meeting.scheduled_duration_minutes,
    room_opened_at: meeting.room_opened_at,
    daily_room_name: meeting.daily_room_name,
    join_attempts: joinCounts.get(meeting.id) ?? 0,
    accepted_at: meeting.accepted_at,
    declined_at: meeting.declined_at,
    cancelled_at: meeting.cancelled_at,
    completed_at: meeting.completed_at,
    created_at: meeting.created_at,
    updated_at: meeting.updated_at
  }));

  return toCsv(
    [
      { key: "id", label: "Meeting ID" },
      { key: "team_id", label: "Team ID" },
      { key: "team_name", label: "Team" },
      { key: "team_city", label: "City" },
      { key: "team_country", label: "Country" },
      { key: "player_profile_id", label: "Player Profile ID" },
      { key: "player_name", label: "Player" },
      { key: "player_location", label: "Player Location" },
      { key: "requested_by", label: "Requested By" },
      { key: "responded_by", label: "Responded By" },
      { key: "status", label: "Status" },
      { key: "request_reason", label: "Reason" },
      { key: "scheduled_at", label: "Scheduled At" },
      { key: "duration_minutes", label: "Duration Minutes" },
      { key: "room_opened_at", label: "Room Opened At" },
      { key: "daily_room_name", label: "Daily Room" },
      { key: "join_attempts", label: "Join Attempts" },
      { key: "accepted_at", label: "Accepted At" },
      { key: "declined_at", label: "Declined At" },
      { key: "cancelled_at", label: "Cancelled At" },
      { key: "completed_at", label: "Completed At" },
      { key: "created_at", label: "Created At" },
      { key: "updated_at", label: "Updated At" }
    ],
    rows
  );
}

export async function GET(request: NextRequest) {
  const dataset = request.nextUrl.searchParams.get("dataset") ?? "summary";
  if (!datasetLabels[dataset]) {
    return NextResponse.json({ error: "Unknown export dataset." }, { status: 400 });
  }

  const { serviceClient, response } = await requireAdminServiceClient();
  if (response) return response;
  if (!serviceClient) return NextResponse.json({ error: "Admin export unavailable." }, { status: 500 });

  if (dataset === "summary") {
    return csvResponse(dataset, await exportSummary(serviceClient));
  }
  if (dataset === "staff-invites") {
    return csvResponse(dataset, await exportStaffInvites(serviceClient));
  }
  if (dataset === "join-requests") {
    return csvResponse(dataset, await exportJoinRequests(serviceClient));
  }

  return csvResponse(dataset, await exportCalls(serviceClient));
}
