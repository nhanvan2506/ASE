// API Schema Types - Matching Backend FastAPI Models

// ============================================================================
// Enums
// ============================================================================

export enum UserRole {
  STUDENT = "student",
  ADMIN = "admin",
  LECTURER = "lecturer", 
}

export enum UserStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum SpaceStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
}

export enum BookingStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
  NO_SHOW = "no_show",
}

export enum PenaltyStatus {
  ACTIVE = "active",
  RESOLVED = "resolved",
  EXPIRED = "expired",
}

// ============================================================================
// User Schemas
// ============================================================================

export interface UserResponse {
  id: number;
  role: UserRole;
  status: UserStatus;
  email: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  student_id?: string | null;
  department?: string | null;
  year_of_study?: number | null;
  phone?: string | null;
  profile_image_url?: string | null;
  joined_at: string; // ISO datetime string
}

export interface UserSummaryResponse {
  id: number;
  full_name: string;
  email: string;
  student_id?: string | null;
  department?: string | null;
  profile_image_url?: string | null;
  status: UserStatus;
  total_bookings: number;
  average_rating?: number | null;
}

// ============================================================================
// Space Schemas
// ============================================================================

export interface SpaceResponse {
  id: number;
  name: string;
  building: string;
  floor: string;
  location?: string | null;
  capacity: number;
  image_url?: string | null;
  status: SpaceStatus;
  utilities: string[]; // Array of utility keys
  created_at: string;
  updated_at: string;
}

export interface UtilityResponse {
  id: number;
  key: string;
  label: string;
  description?: string | null;
}

// ============================================================================
// Booking Schemas
// ============================================================================

export interface BookingResponse {
  id: number;
  user_id: number;
  space_id: number;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: BookingStatus;
  attendees: number;
  purpose: string;
  requested_at: string;
  approved_by?: number | null;
  approved_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  space?: SpaceResponse | null;
  user?: UserSummaryResponse | null;
}

export interface BookingHistoryItem {
  id: number;
  space_name: string;
  date: string;
  time: string;
  status: string;
}

// ============================================================================
// Rating Schema
// ============================================================================

export interface RatingResponse {
  id: number;
  rated_user_id: number;
  booking_id?: number | null;
  rating: number; // 1-5
  comment?: string | null;
  created_at: string;
  created_by?: number | null;
}

// ============================================================================
// Penalty Schema
// ============================================================================

export interface PenaltyResponse {
  id: number;
  user_id: number;
  booking_id?: number | null;
  reason: string;
  points: number;
  status: PenaltyStatus;
  created_at: string;
  created_by?: number | null;
}

// ============================================================================
// Common Schemas
// ============================================================================

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any> | null;
}

export interface HealthResponse {
  status: string;
}

// ============================================================================
// Request Schemas
// ============================================================================

// Auth Requests
export interface RegisterRequest {
  email: string;
  password: string; // Min length: 8
  full_name: string;
  student_id?: string | null;
  department?: string | null;
  year_of_study?: number | null; // 1-7
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface UpdateProfileRequest {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  year_of_study?: number | null; // 1-7
  phone?: string | null;
  profile_image_url?: string | null;
}

// Space Requests
export interface CreateSpaceRequest {
  name: string;
  building: string;
  floor: string;
  location?: string | null;
  capacity: number; // >= 1
  image_url?: string | null;
  status?: SpaceStatus;
  utilities?: string[];
}

export interface UpdateSpaceRequest {
  name?: string | null;
  building?: string | null;
  floor?: string | null;
  location?: string | null;
  capacity?: number | null; // >= 1
  image_url?: string | null;
  status?: SpaceStatus | null;
  utilities?: string[] | null;
}

export interface SpaceListParams {
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
  q?: string; // search in name/building
  building?: string;
  floor?: string;
  capacityMin?: number;
  capacityMax?: number;
  utilities?: string; // comma-separated keys
  status?: SpaceStatus; // default: active only
}

// Utility Requests
export interface CreateUtilityRequest {
  key: string;
  label: string;
  description?: string | null;
}

export interface UpdateUtilityRequest {
  label?: string | null;
  description?: string | null;
}

// Booking Requests
export interface CreateBookingRequest {
  space_id: number;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  attendees: number; // >= 1
  purpose: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  cancellation_reason?: string | null;
}

// Alias for backwards compatibility
export type UpdateBookingRequest = UpdateBookingStatusRequest;

export interface BookingListParams {
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
  status?: BookingStatus;
  my?: boolean; // default: true - Admin filter for own bookings
  userId?: number; // Admin filter by user
  spaceId?: number; // Filter by space
}

// Admin User Requests
export interface AdminUserListParams {
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
  q?: string; // search in name/email/student_id
  status?: UserStatus;
}

export interface AdminUpdateUserRequest {
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserProfileRequest {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  year_of_study?: number | null; // 1-7
  phone?: string | null;
  profile_image_url?: string | null;
}

export interface AdminUserSummaryResponse {
  user: UserResponse;
  booking_history: BookingHistoryItem[];
  penalties: PenaltyResponse[];
  ratings: RatingResponse[];
}

// Penalty Requests
export interface CreatePenaltyRequest {
  user_id: number;
  booking_id?: number | null;
  reason: string;
  points: number; // 1-50
}

// Backend uses AddPenaltyRequest
export type AddPenaltyRequest = CreatePenaltyRequest;

export interface UpdatePenaltyRequest {
  status: PenaltyStatus;
}

export interface PenaltyListParams {
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
  q?: string; // search in reason
  status?: PenaltyStatus;
  userId?: number;
}

// Rating Requests
export interface CreateRatingRequest {
  rated_user_id: number;
  booking_id?: number | null;
  rating: number; // 1-5
  comment?: string | null;
}

// Backend uses AddRatingRequest
export type AddRatingRequest = CreateRatingRequest;

export interface RatingListParams {
  limit?: number; // 1-100, default: 20
  offset?: number; // default: 0
  q?: string; // search in comment
  ratedUserId?: number;
}

// ============================================================================
// Auth Response Schemas
// ============================================================================

export interface AuthTokenResponse {
  token: string;
  user: UserResponse;
}
