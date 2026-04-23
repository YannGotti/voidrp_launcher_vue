using System.IO;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VoidRpLauncher.CoreHost.Models;
using VoidRpLauncher.CoreHost.Models.Account;
using VoidRpLauncher.CoreHost.Services;

namespace VoidRpLauncher.CoreHost.Services.Account;

public sealed class LauncherAccountApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    public LauncherAccountApiClient(HttpClient httpClient, string apiBaseUrl)
    {
        _httpClient = httpClient;
        if (_httpClient.BaseAddress is null) _httpClient.BaseAddress = new Uri(apiBaseUrl.TrimEnd('/') + "/");
    }

    public Task<TokenPairResponseDto> LoginAsync(string login, string password, string deviceName, CancellationToken cancellationToken = default)
        => PostJsonAsync<TokenPairResponseDto>("auth/login", new LoginRequestDto { Login = login, Password = password, DeviceName = deviceName }, cancellationToken);

    public Task<TokenPairResponseDto> RefreshAsync(string refreshToken, string deviceName, CancellationToken cancellationToken = default)
        => PostJsonAsync<TokenPairResponseDto>("auth/refresh", new RefreshRequestDto { RefreshToken = refreshToken, DeviceName = deviceName }, cancellationToken);

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.PostAsJsonAsync("auth/logout", new LogoutRequestDto { RefreshToken = refreshToken }, JsonOptions, cancellationToken);
        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NoContent)
        {
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Logout failed: {text}");
        }
    }

    public async Task<RevokeSessionsResponseDto> RevokeOtherSessionsAsync(string accessToken, string refreshToken, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "account/revoke-other-sessions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new RevokeOtherSessionsRequestDto { RefreshToken = refreshToken }, options: JsonOptions);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<RevokeSessionsResponseDto>(response, cancellationToken);
    }

    public async Task<MeResponseDto> GetMeAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<MeResponseDto>(response, cancellationToken);
    }

    public async Task<IssuePlayTicketResponseDto> RequestPlayTicketAsync(string accessToken, string launcherVersion, string launcherPlatform, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "launcher/play-ticket");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new IssuePlayTicketRequestDto { LauncherVersion = launcherVersion, LauncherPlatform = launcherPlatform }, options: JsonOptions);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<IssuePlayTicketResponseDto>(response, cancellationToken);
    }

    public async Task<LauncherDashboardResponseDto> GetLauncherDashboardAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "launcher/me/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<LauncherDashboardResponseDto>(response, cancellationToken);
    }

    private async Task<T> PostJsonAsync<T>(string url, object payload, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.PostAsJsonAsync(url, payload, JsonOptions, cancellationToken);
        return await ReadJsonAsync<T>(response, cancellationToken);
    }

    private static async Task<T> ReadJsonAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(detail) ? $"Request failed: {(int)response.StatusCode}" : detail);
        }
        var payload = await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
        return payload ?? throw new InvalidOperationException("Empty API response");
    }
}

public sealed class LauncherTokenStore
{
    private readonly string _directoryPath;
    private readonly string _filePath;
    public LauncherTokenStore(string stateDirectoryPath) { _directoryPath = stateDirectoryPath; _filePath = Path.Combine(_directoryPath, "launcher-auth.json"); }

    public async Task SaveAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_directoryPath);
        var json = JsonSerializer.Serialize(new LauncherTokenEnvelope { RefreshToken = refreshToken });
        var bytes = Encoding.UTF8.GetBytes(json);
        var protectedBytes = Protect(bytes);
        await File.WriteAllBytesAsync(_filePath, protectedBytes, cancellationToken);
        TryRestrictFilePermissions(_filePath);
    }

    public async Task<string?> LoadRefreshTokenAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_filePath)) return null;
        var raw = await File.ReadAllBytesAsync(_filePath, cancellationToken);
        var json = Encoding.UTF8.GetString(Unprotect(raw));
        var envelope = JsonSerializer.Deserialize<LauncherTokenEnvelope>(json);
        return string.IsNullOrWhiteSpace(envelope?.RefreshToken) ? null : envelope.RefreshToken;
    }

    public Task ClearAsync(CancellationToken cancellationToken = default)
    {
        if (File.Exists(_filePath)) File.Delete(_filePath);
        return Task.CompletedTask;
    }

    private static byte[] Protect(byte[] input) => OperatingSystem.IsWindows() ? ProtectedData.Protect(input, null, DataProtectionScope.CurrentUser) : input;
    private static byte[] Unprotect(byte[] input) => OperatingSystem.IsWindows() ? ProtectedData.Unprotect(input, null, DataProtectionScope.CurrentUser) : input;

    private static void TryRestrictFilePermissions(string filePath)
    {
        if (OperatingSystem.IsWindows())
            return;

        try
        {
            File.SetUnixFileMode(filePath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        catch
        {
        }
    }
}

public sealed class LauncherPlayTicketStore
{
    private readonly string _directoryPath;
    private readonly string _filePath;
    public LauncherPlayTicketStore(string stateDirectoryPath) { _directoryPath = stateDirectoryPath; _filePath = Path.Combine(_directoryPath, "play-ticket.json"); }
    public string FilePath => _filePath;

    public async Task SaveAsync(LauncherPlayTicketEnvelope envelope, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_directoryPath);
        await File.WriteAllTextAsync(_filePath, JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true }), cancellationToken);
        TryRestrictFilePermissions(_filePath);
    }

    public async Task<LauncherPlayTicketEnvelope?> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_filePath)) return null;
        return JsonSerializer.Deserialize<LauncherPlayTicketEnvelope>(await File.ReadAllTextAsync(_filePath, cancellationToken));
    }

    public void ClearIfExpired()
    {
        if (!File.Exists(_filePath)) return;
        try
        {
            var envelope = JsonSerializer.Deserialize<LauncherPlayTicketEnvelope>(File.ReadAllText(_filePath));
            if (envelope is null || envelope.ExpiresAtUtc <= DateTimeOffset.UtcNow) File.Delete(_filePath);
        }
        catch
        {
            try { File.Delete(_filePath); } catch { }
        }
    }

    public Task ClearAsync(CancellationToken cancellationToken = default)
    {
        if (File.Exists(_filePath)) File.Delete(_filePath);
        return Task.CompletedTask;
    }

    private static void TryRestrictFilePermissions(string filePath)
    {
        if (OperatingSystem.IsWindows())
            return;

        try
        {
            File.SetUnixFileMode(filePath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        catch
        {
        }
    }
}


public sealed class LauncherAuthSessionService
{
    private readonly LauncherAccountApiClient _apiClient;
    private readonly LauncherTokenStore _tokenStore;
    private readonly DiagnosticsService _diagnostics;
    private readonly string _deviceName;
    private LauncherAuthSnapshot? _snapshot;

    public LauncherAuthSessionService(LauncherAccountApiClient apiClient, LauncherTokenStore tokenStore, DiagnosticsService diagnostics, string deviceName = "VoidRP Launcher")
    {
        _apiClient = apiClient;
        _tokenStore = tokenStore;
        _diagnostics = diagnostics;
        _deviceName = deviceName;
    }

    public LauncherAuthSnapshot? Snapshot => _snapshot;
    public bool IsAuthenticated => _snapshot?.IsAuthenticated == true;

    public async Task<LauncherAuthSnapshot?> TryRestoreAsync(CancellationToken cancellationToken = default)
    {
        var refreshToken = await _tokenStore.LoadRefreshTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            _snapshot = null;
            _diagnostics.Info("Auth", "No saved refresh token found.");
            return null;
        }
        try
        {
            var refreshed = await _apiClient.RefreshAsync(refreshToken, _deviceName, cancellationToken);
            _snapshot = ToSnapshot(refreshed);
            await _tokenStore.SaveAsync(_snapshot.RefreshToken, cancellationToken);
            _diagnostics.Info("Auth", $"Session restored for {_snapshot.User.SiteLogin}.");
            return _snapshot;
        }
        catch (Exception ex)
        {
            _snapshot = null;
            await _tokenStore.ClearAsync(cancellationToken);
            _diagnostics.Warn("Auth", $"Session restore failed. Token cleared. {ex.Message}");
            return null;
        }
    }

    public async Task<LauncherAuthSnapshot> LoginAsync(string login, string password, CancellationToken cancellationToken = default)
    {
        var payload = await _apiClient.LoginAsync(login, password, _deviceName, cancellationToken);
        _snapshot = ToSnapshot(payload);
        await _tokenStore.SaveAsync(_snapshot.RefreshToken, cancellationToken);
        _diagnostics.Info("Auth", $"Login succeeded for {_snapshot.User.SiteLogin}.");
        return _snapshot;
    }

    public async Task<LauncherAuthSnapshot> ReloadMeAsync(CancellationToken cancellationToken = default)
    {
        if (_snapshot is null || string.IsNullOrWhiteSpace(_snapshot.AccessToken)) throw new InvalidOperationException("Launcher user is not authenticated");
        var me = await _apiClient.GetMeAsync(_snapshot.AccessToken, cancellationToken);
        _snapshot.User = me.User;
        _snapshot.PlayerAccount = me.PlayerAccount;
        _snapshot.Security = me.Security ?? new AccountSecurityReadDto();
        _diagnostics.Info("Auth", $"Profile reloaded for {_snapshot.User.SiteLogin}.");
        return _snapshot;
    }

    public async Task<IssuePlayTicketResponseDto> RequestPlayTicketAsync(string launcherVersion, string launcherPlatform, CancellationToken cancellationToken = default)
    {
        if (_snapshot is null || string.IsNullOrWhiteSpace(_snapshot.AccessToken)) throw new InvalidOperationException("Launcher user is not authenticated");
        return await _apiClient.RequestPlayTicketAsync(_snapshot.AccessToken, launcherVersion, launcherPlatform, cancellationToken);
    }

    public async Task<LauncherDashboardResponseDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        if (_snapshot is null || string.IsNullOrWhiteSpace(_snapshot.AccessToken)) throw new InvalidOperationException("Launcher user is not authenticated");
        return await _apiClient.GetLauncherDashboardAsync(_snapshot.AccessToken, cancellationToken);
    }

    public async Task<RevokeSessionsResponseDto> RevokeOtherSessionsAsync(CancellationToken cancellationToken = default)
    {
        if (_snapshot is null || string.IsNullOrWhiteSpace(_snapshot.AccessToken) || string.IsNullOrWhiteSpace(_snapshot.RefreshToken)) throw new InvalidOperationException("Launcher user is not authenticated");
        return await _apiClient.RevokeOtherSessionsAsync(_snapshot.AccessToken, _snapshot.RefreshToken, cancellationToken);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        var refreshToken = _snapshot?.RefreshToken ?? await _tokenStore.LoadRefreshTokenAsync(cancellationToken);
        _snapshot = null;
        await _tokenStore.ClearAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            try { await _apiClient.LogoutAsync(refreshToken, cancellationToken); } catch { }
        }
        _diagnostics.Info("Auth", "Local session cleared.");
    }

    public string RequireMinecraftNickname()
    {
        if (!IsAuthenticated || string.IsNullOrWhiteSpace(_snapshot?.PlayerAccount?.MinecraftNickname)) throw new InvalidOperationException("No authenticated launcher account");
        return _snapshot.PlayerAccount.MinecraftNickname;
    }

    private static LauncherAuthSnapshot ToSnapshot(TokenPairResponseDto payload)
        => new() { AccessToken = payload.AccessToken, RefreshToken = payload.RefreshToken, User = payload.User, PlayerAccount = payload.PlayerAccount, Security = new AccountSecurityReadDto() };
}

public sealed class AuthenticatedLaunchService
{
    private readonly LauncherAuthSessionService _authSessionService;
    private readonly LocalMinecraftLaunchService _localMinecraftLaunchService;
    private readonly LauncherPlayTicketStore _playTicketStore;
    private readonly AppVersionService _appVersionService;
    private readonly LauncherPathsService _launcherPathsService;
    private readonly DiagnosticsService _diagnostics;

    public AuthenticatedLaunchService(LauncherAuthSessionService authSessionService, LocalMinecraftLaunchService localMinecraftLaunchService, LauncherPlayTicketStore playTicketStore, AppVersionService appVersionService, LauncherPathsService launcherPathsService, DiagnosticsService diagnostics)
    {
        _authSessionService = authSessionService;
        _localMinecraftLaunchService = localMinecraftLaunchService;
        _playTicketStore = playTicketStore;
        _appVersionService = appVersionService;
        _launcherPathsService = launcherPathsService;
        _diagnostics = diagnostics;
    }

    public async Task LaunchAsync(LauncherManifest manifest, int maximumRamMb, IProgress<LaunchProgressInfo>? progress = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var nickname = _authSessionService.RequireMinecraftNickname();
        _playTicketStore.ClearIfExpired();
        progress?.Report(new LaunchProgressInfo { Stage = "Подготавливаем вход", Details = "Запрашиваем игровой ticket для входа через официальный лаунчер...", Percent = 5 });
        _diagnostics.Info("Launch", $"Requesting play ticket for {nickname}.");
        var playTicket = await _authSessionService.RequestPlayTicketAsync(_appVersionService.CurrentVersion, _launcherPathsService.Platform.DisplayName, cancellationToken);
        await _playTicketStore.SaveAsync(new LauncherPlayTicketEnvelope { Ticket = playTicket.Ticket, MinecraftNickname = playTicket.MinecraftNickname, ExpiresAtUtc = playTicket.ExpiresAt, Source = "VoidRP Launcher" }, cancellationToken);
        progress?.Report(new LaunchProgressInfo { Stage = "Авторизация", Details = $"Используем аккаунт {nickname}. Ticket сохранён во временный state-файл.", Percent = 15 });
        await _localMinecraftLaunchService.LaunchAsync(nickname, manifest, maximumRamMb);
        progress?.Report(new LaunchProgressInfo { Stage = "Запуск", Details = "Minecraft запущен.", Percent = 100 });
        _diagnostics.Info("Launch", $"Minecraft launched for {nickname} with {maximumRamMb} MB RAM.");
    }
}