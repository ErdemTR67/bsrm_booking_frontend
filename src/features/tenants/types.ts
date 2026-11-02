export type Tenant = { id: string; name: string; slug: string; is_active: boolean; created_at: string; updated_at: string }
export type MembershipRole = 'owner' | 'admin' | 'manager' | 'staff'
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'
export type Membership = {
  id: string; tenant_id: string; user_id: string; role: MembershipRole; is_active: boolean
  created_at: string; updated_at: string
}
export type TenantInvitation = {
  id: string; tenant_id: string; email: string; role: MembershipRole; status: InvitationStatus
  expires_at: string; accepted_at: string | null; revoked_at: string | null; sent_at: string | null
  created_at: string; acceptance_url: string | null
}
