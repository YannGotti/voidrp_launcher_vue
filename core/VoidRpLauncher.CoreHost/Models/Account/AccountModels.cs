using System;
using System.Text.Json.Serialization;

namespace VoidRpLauncher.CoreHost.Models.Account;

public sealed class LoginRequestDto
{
    [JsonPropertyName("login")] public string Login { get; set; } = string.Empty;
    [JsonPropertyName("password")] public string Password { get; set; } = string.Empty;
    [JsonPropertyName("device_name")] public string DeviceName { get; set; } = "VoidRP Launcher";
}

public sealed class RefreshRequestDto
{
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
    [JsonPropertyName("device_name")] public string DeviceName { get; set; } = "VoidRP Launcher";
}

public sealed class LogoutRequestDto
{
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
}

public sealed class RevokeOtherSessionsRequestDto
{
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
}

public sealed class RevokeSessionsResponseDto
{
    [JsonPropertyName("message")] public string Message { get; set; } = string.Empty;
    [JsonPropertyName("revoked_sessions")] public int RevokedSessions { get; set; }
}

public sealed class IssuePlayTicketRequestDto
{
    [JsonPropertyName("launcher_version")] public string LauncherVersion { get; set; } = "unknown";
    [JsonPropertyName("launcher_platform")] public string LauncherPlatform { get; set; } = "unknown";
}

public sealed class IssuePlayTicketResponseDto
{
    [JsonPropertyName("ticket")] public string Ticket { get; set; } = string.Empty;
    [JsonPropertyName("expires_at")] public DateTimeOffset ExpiresAt { get; set; }
    [JsonPropertyName("minecraft_nickname")] public string MinecraftNickname { get; set; } = string.Empty;
    [JsonPropertyName("ttl_seconds")] public int TtlSeconds { get; set; }
}

public sealed class UserReadDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("site_login")] public string SiteLogin { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("email_verified")] public bool EmailVerified { get; set; }
    [JsonPropertyName("is_active")] public bool IsActive { get; set; }
    [JsonPropertyName("created_at")] public DateTimeOffset CreatedAt { get; set; }
}

public sealed class PlayerAccountReadDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("minecraft_nickname")] public string MinecraftNickname { get; set; } = string.Empty;
    [JsonPropertyName("nickname_locked")] public bool NicknameLocked { get; set; }
    [JsonPropertyName("legacy_auth_enabled")] public bool LegacyAuthEnabled { get; set; }
}

public sealed class AccountSecurityReadDto
{
    [JsonPropertyName("active_refresh_sessions")] public int ActiveRefreshSessions { get; set; }
    [JsonPropertyName("must_use_launcher")] public bool MustUseLauncher { get; set; }
    [JsonPropertyName("legacy_hash_present")] public bool LegacyHashPresent { get; set; }
    [JsonPropertyName("legacy_ready")] public bool LegacyReady { get; set; }
}

public sealed class TokenPairResponseDto
{
    [JsonPropertyName("access_token")] public string AccessToken { get; set; } = string.Empty;
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
    [JsonPropertyName("token_type")] public string TokenType { get; set; } = "bearer";
    [JsonPropertyName("access_expires_in")] public int AccessExpiresIn { get; set; }
    [JsonPropertyName("refresh_expires_in")] public int RefreshExpiresIn { get; set; }
    [JsonPropertyName("user")] public UserReadDto User { get; set; } = new();
    [JsonPropertyName("player_account")] public PlayerAccountReadDto PlayerAccount { get; set; } = new();
}

public sealed class MeResponseDto
{
    [JsonPropertyName("user")] public UserReadDto User { get; set; } = new();
    [JsonPropertyName("player_account")] public PlayerAccountReadDto PlayerAccount { get; set; } = new();
    [JsonPropertyName("security")] public AccountSecurityReadDto Security { get; set; } = new();
}

public sealed class LauncherAuthSnapshot
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public UserReadDto User { get; set; } = new();
    public PlayerAccountReadDto PlayerAccount { get; set; } = new();
    public AccountSecurityReadDto Security { get; set; } = new();
    public bool IsAuthenticated => !string.IsNullOrWhiteSpace(AccessToken) && !string.IsNullOrWhiteSpace(RefreshToken) && !string.IsNullOrWhiteSpace(PlayerAccount?.MinecraftNickname);
}

public sealed class LauncherPlayTicketEnvelope
{
    [JsonPropertyName("ticket")] public string Ticket { get; set; } = string.Empty;
    [JsonPropertyName("minecraftNickname")] public string MinecraftNickname { get; set; } = string.Empty;
    [JsonPropertyName("expiresAtUtc")] public DateTimeOffset ExpiresAtUtc { get; set; }
    [JsonPropertyName("source")] public string Source { get; set; } = "VoidRP Launcher";
}

public sealed class LauncherTokenEnvelope
{
    public string RefreshToken { get; set; } = string.Empty;
}



