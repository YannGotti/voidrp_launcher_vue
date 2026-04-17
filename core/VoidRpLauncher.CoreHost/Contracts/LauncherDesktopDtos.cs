namespace VoidRpLauncher.CoreHost.Contracts;

public sealed class LauncherProgressDto
{
    public bool Visible { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public double Percent { get; set; }
}

public sealed class LauncherLinksDto
{
    public string RegisterUrl { get; set; } = string.Empty;
    public string ForgotPasswordUrl { get; set; } = string.Empty;
    public string VerifyEmailUrl { get; set; } = string.Empty;
}

public sealed class LauncherStateDto
{
    public bool Initialized { get; set; }
    public bool IsBusy { get; set; }
    public bool IsAuthenticated { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string LauncherVersionText { get; set; } = string.Empty;
    public string AccountPrimaryText { get; set; } = string.Empty;
    public string AccountSecondaryText { get; set; } = string.Empty;
    public string EmailVerifiedText { get; set; } = string.Empty;
    public int CurrentMemoryMb { get; set; }
    public string CurrentMemoryText { get; set; } = string.Empty;
    public string LogsDirectory { get; set; } = string.Empty;
    public string DataDirectory { get; set; } = string.Empty;
    public string GameDirectory { get; set; } = string.Empty;
    public string DiagnosticsText { get; set; } = string.Empty;
    public LauncherProgressDto Progress { get; set; } = new();
    public LauncherLinksDto Links { get; set; } = new();
}

public sealed class OperationResponseDto
{
    public bool Ok { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool PendingElectronExit { get; set; }
    public LauncherStateDto State { get; set; } = new();

    public static OperationResponseDto Success(LauncherStateDto state, string message = "", bool pendingElectronExit = false)
        => new() { Ok = true, Message = message, State = state, PendingElectronExit = pendingElectronExit };

    public static OperationResponseDto Failure(LauncherStateDto state, string message)
        => new() { Ok = false, Message = message, State = state, PendingElectronExit = false };
}

public sealed class LoginCommandDto
{
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class SettingsUpdateDto
{
    public int MaxRamMb { get; set; }
}



