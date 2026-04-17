using VoidRpLauncher.CoreHost.Configuration;
using VoidRpLauncher.CoreHost.Contracts;
using VoidRpLauncher.CoreHost.Models.Account;

namespace VoidRpLauncher.CoreHost.Services;

public sealed class LauncherStateService
{
    private readonly object _lock = new();
    private bool _initialized;
    private bool _isBusy;
    private string _statusText = "Инициализация лаунчера...";
    private string _accountPrimaryText = "Гость";
    private string _accountSecondaryText = "Войдите, чтобы запустить игру";
    private string _emailVerifiedText = "Требуется вход";
    private LauncherProgressDto _progress = new();
    private LauncherAuthSnapshot? _snapshot;

    public bool IsInitialized
    {
        get { lock (_lock) return _initialized; }
    }

    public bool IsBusy
    {
        get { lock (_lock) return _isBusy; }
    }

    public void SetInitialized(bool value)
    {
        lock (_lock)
        {
            _initialized = value;
        }
    }

    public void SetBusy(bool value)
    {
        lock (_lock)
        {
            _isBusy = value;
        }
    }

    public void SetStatus(string statusText)
    {
        lock (_lock)
        {
            _statusText = statusText;
        }
    }

    public void SetProgress(string title, string details, double percent)
    {
        lock (_lock)
        {
            _progress = new LauncherProgressDto
            {
                Visible = true,
                Title = title,
                Details = details,
                Percent = ClampPercent(percent)
            };
        }
    }

    public void ClearProgress()
    {
        lock (_lock)
        {
            _progress = new LauncherProgressDto();
        }
    }

    public void ApplySnapshot(LauncherAuthSnapshot? snapshot)
    {
        lock (_lock)
        {
            _snapshot = snapshot;
            if (snapshot?.IsAuthenticated != true)
            {
                _accountPrimaryText = "Гость";
                _accountSecondaryText = "Войдите, чтобы запустить игру";
                _emailVerifiedText = "Требуется вход";
                return;
            }

            _accountPrimaryText = string.IsNullOrWhiteSpace(snapshot.PlayerAccount.MinecraftNickname)
                ? snapshot.User.SiteLogin
                : snapshot.PlayerAccount.MinecraftNickname;
            _accountSecondaryText = $"{snapshot.User.SiteLogin} • {snapshot.User.Email}";
            _emailVerifiedText = snapshot.User.EmailVerified ? "Почта подтверждена" : "Почта не подтверждена";
        }
    }

    public LauncherStateDto BuildState(
        LauncherPathsService pathsService,
        LauncherSettingsService settingsService,
        DiagnosticsService diagnosticsService,
        AppVersionService appVersionService,
        AppEndpointsOptions endpoints)
    {
        lock (_lock)
        {
            var settings = settingsService.Load();
            return new LauncherStateDto
            {
                Initialized = _initialized,
                IsBusy = _isBusy,
                IsAuthenticated = _snapshot?.IsAuthenticated == true,
                StatusText = _statusText,
                LauncherVersionText = appVersionService.CurrentVersion,
                AccountPrimaryText = _accountPrimaryText,
                AccountSecondaryText = _accountSecondaryText,
                EmailVerifiedText = _emailVerifiedText,
                CurrentMemoryMb = settings.MaxRamMb,
                CurrentMemoryText = $"{settings.MaxRamMb / 1024.0:0.0} GB",
                LogsDirectory = pathsService.LogsDirectory,
                DataDirectory = pathsService.BaseDirectory,
                GameDirectory = pathsService.GameDirectory,
                DiagnosticsText = diagnosticsService.Text,
                Progress = new LauncherProgressDto
                {
                    Visible = _progress.Visible,
                    Title = _progress.Title,
                    Details = _progress.Details,
                    Percent = _progress.Percent
                },
                Links = new LauncherLinksDto
                {
                    RegisterUrl = endpoints.RegisterUrl,
                    ForgotPasswordUrl = endpoints.ForgotPasswordUrl,
                    VerifyEmailUrl = endpoints.VerifyEmailUrl
                }
            };
        }
    }

    private static double ClampPercent(double value)
    {
        if (value < 0) return 0;
        if (value > 100) return 100;
        return value;
    }
}



